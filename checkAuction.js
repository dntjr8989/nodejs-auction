const schedule = require('node-schedule');
const {Good, User, Auction, sequelize} = require('./models');

module.exports = async()=>{
    try{
        const goods = await Good.findAll({
            where : {SoldId : null}, 
         });
     
         console.log(goods);

         for(let i=0; i<goods.length; i++)
         {
             const end = goods[i].createAt + goods[i].time;
             const now = new Date();
     
             //서버가 꺼진 사이에 경매가 끝나지 않은 것들 다시 스케줄러
             if(end >= now)
             {
                 schedule.scheduleJob(end, async()=>{
                     const t = await sequelize.transaction;
                     try{
                         const success = await Auction.findOne({
                             where:{GoodId:goods[i].id},
                             order:[['bid','DESC']],
                             transaction:t,
                         });
                         //입찰 한 사람이 없는 경우
                         if(!success)
                         {
                            await Good.update({SoldId : goods[i].OwnerId},{where:{id:goods[i].id}});                             
                            await t.rollback();
                         }
                         else
                         {
                             await Good.update({SoldId : success.UserId}, {where:{id:goods[i].id}, transaction:t,});
                             await User.update({
                                money:sequelize.literal(`money-$success.bid`),
                              },{
                                 where:{id:success.User.id},
                                transaction: t,
                             });
                         }
                         await t.commit();
                     }
                     catch(error){
                         await t.rollback();
                     }
                 });
             }
             //서버가 꺼진 사이에 경매가 끝난 것들은 경매 끝난 것 처리해주기
             else
             {
                const t = await sequelize.transaction;
                try{
                    const success = await Auction.findOne({
                        where:{GoodId:goods[i].id},
                        order:[['bid','DESC']],
                        transaction:t,
                    });
                    //입찰 한 사람이 없는 경우
                    if(!success)
                    {
                       await Good.update({SoldId : goods[i].OwnerId},{where:{id:goods[i].id}});                             
                       await t.rollback();
                    }
                    else
                    {
                        await Good.update({SoldId : success.UserId}, {where:{id:goods[i].id}, transaction:t,});
                        await User.update({
                           money:sequelize.literal(`money-$success.bid`),
                         },{
                            where:{id:success.User.id},
                           transaction: t,
                        });
                    }
                    await t.commit();
                }
                catch(error){
                    await t.rollback();
                }
             }
         }
    }
    catch (error) {
        console.error(error);
    }
};