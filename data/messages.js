const adminMessage = `
*🔧 Admin Commands:*

👤 *User Management*
/users – View total user count
/add_user – Add a new user to the system  
/remove_user – Remove a user from the system  
/view_users – View all registered users  

📢 *Messaging*
/send_message – Send a message to all users  
/send_announcement – Broadcast an announcement  

🗳️ *Polls & Feedback*
/add_poll – Create a new poll  
/close_poll – Close an active poll  
/view_polls – View ongoing polls  
/view_feedback – View feedback from users  
/view_suggestions – View suggestions from users  

📅 *Events & Scheduling*
/add_event – Add a new event to the calendar  
/view_events – View all scheduled events  
/upload_timetable – Upload the class timetable  

📂 *Data Management*
/upload – Upload a file or document  
/add – Add general data  
/update – Update general data  
/update_contact – Update a contact  
/update_contacts – Update multiple contacts  
`;

const helpMessage = `
👋 *Welcome to the Covenant University Student Council Bot!*

Here are the commands you can use:

📢 /announcements – View the latest updates from the Student Council  
📅 /events – See upcoming school events and activities  
🗳 /poll – Participate in ongoing polls or vote on issues  
💡 /suggest – Share your suggestions or ideas  
❓ /faq – Get answers to common questions  
✉️ /contact – Contact the Student Council (you can stay anonymous) 
/contacts – Sends a list of email contacts
🎉 /fun – Get daily quotes, fun facts, or trivia  
📚 /help – Show this help message again

— *Covenant University Student Council*
  `;


const morningMessages = [
    "Good morning! 🌞 Another beautiful day in CU… the stress won’t kill you today. We pray. 😭😂",
    "Rise and shine! 🌅 You survived yesterday — today should be scared of YOU. 💪🔥",
    "Good morning! CU is hard but you? You're built different. Even MSS greets you now. 😎",
    "Morning! 🌞 At least you're not rushing for a 7AM exam today… or are you? 👀",
    "Good morning! 💥 Waking up early in CU deserves a national award. This place no be for weak people 😂",
    "Good morning! 🌄 May your day be smoother than CU WiFi and friendlier than some lecturers 😭",
    "Good morning! ☀️ Even MSS cannot stop your greatness today… unless you run past the wrong path 😭😂",
    "Good morning! 😂 If CU hasn’t stressed you this week, check your timetable again.",
    "Morning! 🌞 Think of what you’ll buy in caf later — let that be your motivation today 🍗😂",
    "Good morning! 💫 Another chance to survive the chaos CU calls ‘academic excellence’ 😭🔥",
    "Good morning! ☀️ If you’re awake before 8AM, congratulations — you're officially a CU student 😎",
    "Morning! 😂 May your day be filled with grace and ZERO random tests. Amen? 🙏🔥",
    "Good morning! 🌅 Today, may your lecturers be calm, your timetable behave, and MSS mind their business 😭",
    "Good morning! 🌄 You’re strong. You’re capable. You’re in CU — you obviously don’t have a choice 😂",
    "Good morning! ☀️ Remember: caf food is waiting for you later. Don't give up now 🍛🔥"
];

const midDayMessages = [
    "It’s midday! 🌞 If CU hasn’t stressed you yet, congratulations — the day is still young 😂",
    "Good afternoon! 🌻 Don’t sleep oh… MSS is watching 👀😭",
    "Midday! 😭 If your lecturer hasn’t shouted today, enjoy it. It’s a rare blessing.",
    "Good afternoon! 🌞 The sun is hot but CU stress is hotter. Stay strong 😂🔥",
    "Midday! 💥 Take water. Hydrate. This is CU — you need strength to survive afternoon classes 💧😂",
    "Good afternoon! 🌈 If your brain is already tired, just know you're not alone. We move together 😭😂",
    "Midday! ☀️ Think of food. That’s enough motivation to survive the next lecture 🍛🔥",
    "Good afternoon! 😂 Remember, confusion is part of the CU curriculum. No mind am.",
    "Midday! 🌞 If you're still standing, you're already winning. CU no fit break you 💪",
    "Good afternoon! 😎 MSS cannot disturb you inside class… hopefully.",
    "Midday! 😂 If you’ve survived your morning lectures, you’re basically an Avenger at this point 🦸‍♂️",
    "Good afternoon! 🥲 Don’t worry. The assignment you forgot will remember you later.",
    "Midday! 🌞 CU heat: 100%. Your strength: also 100% (by faith) 😂🔥",
    "Good afternoon! 🍛 Start planning what you’ll eat in caf. It helps with emotional stability 😭",
    "Midday! 🌞 Rest small — but not too much before MSS thinks you're loitering 😂"
];

const eveningMessages = [
    "Good evening! 🌙 You survived CU today. That alone is an achievement 😂🔥",
    "Evening! 🌆 If the day stressed you, don’t worry — night prayers fix everything 🙏😩",
    "Good evening! 😂 If you understood nothing in class today… join the club. We’re plenty.",
    "Evening! 🌜 Rest well. Tomorrow, the battle continues 😭💪",
    "Good evening! 😭 Even if your CGPA is shaking, your destiny will not shake. Amen? 😂",
    "Evening! 🌙 MSS cannot disturb your sleep — enjoy the freedom 😌💤",
    "Good evening! 🌚 If assignments are plenty, relax. They’ll still be plenty after you rest 😂",
    "Evening! 🌆 CU is tough but your sleep is tougher. Go and rest 😭🔥",
    "Good evening! 🌙 Today stressed you, but you stressed it back. Small win 😂",
    "Evening! 🌜 No matter how your day went, at least you’re not writing a test tonight… I hope 👀",
    "Good evening! 🌚 CU tried to break you but failed. Rest, champion 😎",
    "Evening! 😭 If your lecturer shouted today, forgive and forget — before tomorrow’s class starts 😂",
    "Good evening! 🌙 Recharge tonight. Tomorrow we continue the survival journey.",
    "Evening! 🌆 Let your mind rest. The test/assignment/chapel attendance wahala can wait till tomorrow 😂",
    "Good evening! 🌙 Be proud — CU didn’t finish you today. Victory 🎉🔥"
];

  


module.exports = {
  adminMessage,
  helpMessage,
  morningMessages,
  midDayMessages,
  eveningMessages,
};
