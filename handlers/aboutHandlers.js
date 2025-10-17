module.exports = (bot, app) => {

    bot.onText(/\/about/, (msg) => {
        const chatId = msg.chat.id;

        const aboutMessage = `
👋 *Welcome to CU Dispatch!*

Hey there! I'm *Somtochukwu Philip Duru*, the creator of CU Dispatch.  
I built this platform to make it easier for you to stay updated, access important announcements, view events, share feedback, and stay connected with the CU community — all in one place.

✨ *What you can do with CU Dispatch:*

📢 Receive the latest announcements  
🗓 See upcoming events and schedules  
🗳 Participate in polls and share feedback  
💬 Suggest ideas and improvements  
📚 Get answers to common questions (FAQ)

🙋‍♂️ *About Me:*  
I'm passionate about technology, community building, and making communication smoother through innovation.  
CU Dispatch was created to serve YOU — making information faster, easier, and always within reach.

🔗 *Stay Connected with me:*

Instagram: [@somto2007](https://www.instagram.com/somto2007/)  
GitHub: [MobileGamer-hq](https://github.com/MobileGamer-hq)  
LinkedIn: [Somtochukwu Duru](https://www.linkedin.com/in/somtochukwu-duru-919362253/)  
Website: [somto.web.app](https://somto.web.app/)

Thanks for using CU Dispatch! 🚀  
If you ever have questions, suggestions, or just want to say hi, feel free to reach out!  
Let's make CU better together.
`;

        bot.sendMessage(chatId, aboutMessage, {parse_mode: "Markdown"});
    });
};