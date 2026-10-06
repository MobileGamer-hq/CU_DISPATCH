const userCommands = [
  { command: "start", description: "Register or initialize your session" },
  { command: "help", description: "View available commands and features" },
  { command: "view_info", description: "Check your registered information" },
  { command: "update_info", description: "Update your profile information" },
  { command: "contact", description: "Send a message to the Student Council" },
  { command: "contacts", description: "Get contact details for school offices" },
  { command: "announcements", description: "View latest updates from Student Council" },
  { command: "weekly_events", description: "See CU events for this week" },
  { command: "monthly_events", description: "See CU events for this month" },
  { command: "timetable", description: "View semester timetables" },
  { command: "handbook", description: "Download the student handbook" },
  { command: "faq", description: "Get answers to common questions" },
  { command: "submit_lost_and_found", description: "Report a lost or found item" },
  { command: "lost_and_found", description: "View lost and found items" },
  { command: "encourage", description: "Get an encouraging daily message" },
  { command: "about", description: "Learn about CU Dispatch" }
];

const adminCommands = [
  { command: "users", description: "View total users & level analytics" },
  { command: "view_users", description: "View all registered users" },
  { command: "find", description: "Find user by Matric number" },
  { command: "add_admin", description: "Promote user to admin by Matric" },
  { command: "remove_user", description: "Remove user by Matric number" },
  { command: "verify_user", description: "Verify a user's matric & level" },
  { command: "verify_users", description: "Scan database for invalid users" },
  { command: "warn_user", description: "Send warning message to a user" },
  { command: "purge_user", description: "Purge invalid user record" },
  { command: "send_message", description: "Broadcast message or photo to all users" },
  { command: "add_faq", description: "Add a new FAQ entry" },
  { command: "backup", description: "Backup database (Owner)" },
  { command: "get_backup", description: "View backup stats (Owner)" },
  { command: "clear_chats", description: "Clean up bot message logs (Owner)" }
];

module.exports = {
  userCommands,
  adminCommands,
};
