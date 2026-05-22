import 'dotenv/config';
// import prisma from './config/db';
import app from './app';



const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
