// Function to filter events for the current month
function getMonthlyEvents(events) {
    const currentMonth = moment().format("MMMM"); // Current month in full format (e.g., 'April')

    return events.filter((event) => {
        const eventDate = moment(event["Date"], "Do MMMM, YYYY"); // Format the event's date
        return eventDate.format("MMMM") === currentMonth; // Compare the event's month with the current month
    });
}

// Function to filter events for the current week
function getWeeklyEvents(events) {
    const startOfWeek = moment().startOf("week"); // Sunday
    const endOfWeek = moment().endOf("week"); // Saturday

    return events.filter((event) => {
        const eventDate = moment(event["Date"], "Do MMMM, YYYY");
        return eventDate.isBetween(startOfWeek, endOfWeek, undefined, "[]"); // inclusive
    });
}

// Function to format individual event details
function formatSingleEvent(event) {
    return `
    📅 *Event Name*: ${event["Event Name"]}
    🗓 *Date*: ${event["Date"]}
    🕑 *Time*: ${event["Time"] || "Not yet determined"}
    📍 *Venue*: ${event["Venue"]}
    🏷 *Event Type*: ${event["Event Type"]}
  `;
}