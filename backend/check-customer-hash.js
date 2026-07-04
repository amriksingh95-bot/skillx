const {PrismaClient}=require('@prisma/client');
const bcrypt=require('bcrypt');
const p=new PrismaClient();
p.$queryRaw`SELECT email, password FROM "User" WHERE email = 'customer1@skillxt.com'`
  .then(async r=>{
    const hash=r[0].password;
    console.log('Stored hash:',hash);
    const m1=await bcrypt.compare('dummy@123',hash);
    console.log('dummy@123 match:',m1);
    p.$disconnect();
  })
  .catch(e=>{console.error(e.message);p.$disconnect()});
