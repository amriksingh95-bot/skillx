const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
Promise.all([
  p.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name = 'OTPVerification' ORDER BY ordinal_position`,
  p.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name = 'OTPAttempt' ORDER BY ordinal_position`,
  p.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name = 'RefreshToken' ORDER BY ordinal_position`
]).then(([otp,attempt,refresh])=>{
  console.log('OTPVerification:'); console.table(otp);
  console.log('OTPAttempt:'); console.table(attempt);
  console.log('RefreshToken:'); console.table(refresh);
  p.$disconnect();
}).catch(e=>{console.error(e.message);p.$disconnect()});
