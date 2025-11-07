const axios = require("axios");

const BASE_URL = "https://personal-database-ycmc.onrender.com/projects/cu-dispatch";

// 🔹 Get all data from a collection
async function getData(collection) {
    try {
        const res = await axios.get(`${BASE_URL}/${collection}`);
        return res.data;
    } catch (err) {
        console.error(`Error fetching data from ${collection}:`, err.message);
        return null;
    }
}

// 🔹 Create a new collection
async function createCollection(collection, data) {
    try {
        const res = await axios.post(`${BASE_URL}/${collection}`, data);
        return res.data;
    } catch (err) {
        console.error(`Error creating collection ${collection}:`, err.message);
        return null;
    }
}

// 🔹 Upload a document to a collection
async function uploadData(collection, docId, data) {
    try {
        // ✅ Convert to plain JSON
        const cleanData = JSON.parse(JSON.stringify(data));

        const res = await axios.post(
            `${BASE_URL}/${collection}/${docId}`,
            cleanData,
            {
                headers: { "Content-Type": "application/json" },
            }
        );

        console.log(res.data.message);

        return res.data;
    } catch (err) {
        console.error(`Error uploading data to ${collection}/${docId}:`, err.message);
        return null;
    }
}


// (async () => {
//     let users = await getData("users");
//     console.log(users); // logs data from your cu-dispatch/users collection
//     let newUser = await createCollection("users", {id: 1, name: "Somto", level: "400"});
//     console.log(newUser); // confirms upload
//     newUser = await uploadData("users", "123", {id: 1, name: "Somto", level: "400"});
//     console.log(newUser);
//     users = await getData("users");
//     console.log(users);
// })();

module.exports = {
    createCollection,
    uploadData,
    getData,
};
