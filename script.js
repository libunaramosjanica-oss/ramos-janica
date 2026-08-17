import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
    getDatabase,
    ref,
    set,
    onValue,
    onDisconnect
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";


// =====================================================
// FIREBASE CONFIGURATION
// JANCAL
// =====================================================

const firebaseConfig = {

    apiKey:
        "AIzaSyAazHXV6k9HxJBV8GfHVCIDnDkaIVTytKE",

    authDomain:
        "jancal-fdf43.firebaseapp.com",

    databaseURL:
        "https://jancal-fdf43-default-rtdb.firebaseio.com/",

    projectId:
        "jancal-fdf43",

    storageBucket:
        "jancal-fdf43.firebasestorage.app",

    messagingSenderId:
        "185115630186",

    appId:
        "1:185115630186:web:6382f7c91f42d179800813",

    measurementId:
        "G-JC48WSNV1G"
};


// =====================================================
// INITIALIZE FIREBASE
// =====================================================

const app =
    initializeApp(firebaseConfig);

const db =
    getDatabase(app);


// =====================================================
// DATABASE REFERENCES
// =====================================================

// PERMANENT DATA
//
// ESP32_Data
//     └── DATE
//          └── TIME
//               ├── float
//               ├── int
//               └── string
//

const dataRef =
    ref(db, "ESP32_Data");


// =====================================================
// TEMPORARY COMMAND
// =====================================================
//
// This node is NOT permanent.
//
// Website creates it:
//
// collectionCommand
//     ├── action
//     ├── interval
//     └── timestamp
//
// ESP32 reads it and deletes it.
//
// If website closes, onDisconnect()
// automatically deletes it.
//

const commandRef =
    ref(db, "collectionCommand");


// =====================================================
// HTML ELEMENTS
// =====================================================

const intervalInput =
    document.getElementById("interval");

const saveBtn =
    document.getElementById("saveBtn");

const sensorTable =
    document.getElementById("sensorTable");

const currentInterval =
    document.getElementById("currentInterval");

const statusText =
    document.getElementById("statusText");


// =====================================================
// VARIABLES
// =====================================================

let timer = null;

let counter = 0;

let isCollecting = false;

let selectedInterval = 0;


// =====================================================
// GET DATE
// =====================================================

function getDate() {

    const now =
        new Date();

    return now
        .toISOString()
        .split("T")[0];

}


// =====================================================
// GET TIME
// =====================================================

function getTime() {

    const now =
        new Date();

    return now
        .toLocaleTimeString("en-GB")
        .replace(/:/g, "-");

}


// =====================================================
// SAVE DATA
// =====================================================

async function saveData() {

    // Do nothing if collection is inactive
    if (!isCollecting) {
        return;
    }


    const date =
        getDate();


    const time =
        getTime();


    const currentCounter =
        counter;


    // =================================================
    // PERMANENT DATA PATH
    // =================================================

    const dataLocation =
        ref(
            db,
            `ESP32_Data/${date}/${time}`
        );


    // =================================================
    // DATA
    // =================================================

    const data = {

        float:
            Number(
                (
                    27.55 +
                    currentCounter
                ).toFixed(2)
            ),

        int:
            currentCounter,

        string:
            "value_" +
            currentCounter +
            "0000"

    };


    try {

        await set(
            dataLocation,
            data
        );


        console.log(
            "DATA SAVED"
        );


        console.log(
            "Date:",
            date
        );


        console.log(
            "Time:",
            time
        );


        console.log(
            "Float:",
            data.float
        );


        console.log(
            "Integer:",
            data.int
        );


        console.log(
            "String:",
            data.string
        );


        // Increase AFTER saving
        counter++;


    }

    catch (error) {

        console.error(
            "Firebase save error:",
            error
        );

    }

}


// =====================================================
// START WEBSITE TIMER
// =====================================================

function startWebsiteTimer(seconds) {

    // Stop old timer
    if (timer !== null) {

        clearInterval(timer);

        timer = null;

    }


    // Reset counter
    counter = 0;


    // Store interval
    selectedInterval =
        seconds;


    // Activate website collection
    isCollecting =
        true;


    // Display current interval
    currentInterval.textContent =
        seconds;


    // Display status
    statusText.textContent =
        "COLLECTING";


    // =================================================
    // FIRST RECORD
    // =================================================

    // First record has int = 0
    saveData();


    // =================================================
    // REPEATING COLLECTION
    // =================================================

    timer =
        setInterval(
            () => {

                if (!isCollecting) {
                    return;
                }


                saveData();

            },
            seconds * 1000
        );

}


// =====================================================
// APPLY BUTTON
// =====================================================

saveBtn.addEventListener(
    "click",
    async () => {

        const seconds =
            Number(
                intervalInput.value
            );


        // =================================================
        // VALIDATION
        // =================================================

        if (
            !seconds ||
            seconds <= 0
        ) {

            alert(
                "Please enter a valid number of seconds."
            );

            return;

        }


        // =================================================
        // STOP OLD WEBSITE TIMER
        // =================================================

        if (timer !== null) {

            clearInterval(timer);

            timer = null;

        }


        // =================================================
        // START WEBSITE COLLECTION
        // =================================================

        startWebsiteTimer(
            seconds
        );


        // =================================================
        // SEND TEMPORARY COMMAND
        // =================================================
        //
        // This is NOT ESP32_Data.
        //
        // ESP32 will read this and delete it.
        //

        try {

            await set(
                commandRef,
                {

                    action:
                        "start",

                    interval:
                        seconds,

                    timestamp:
                        Date.now()

                }
            );


            console.log(
                "TEMPORARY COMMAND SENT"
            );


            console.log(
                "Interval:",
                seconds,
                "seconds"
            );


        }

        catch (error) {

            console.error(
                "Unable to send collection command:",
                error
            );

        }

    }
);


// =====================================================
// AUTO DELETE COMMAND WHEN WEBSITE CLOSES
// =====================================================
//
// IMPORTANT:
//
// This does NOT delete ESP32_Data.
//
// It only deletes:
//
// collectionCommand
//
// Therefore the permanent records remain safe.
//

onDisconnect(
    commandRef
).remove()
.then(
    () => {

        console.log(
            "Disconnect cleanup registered."
        );

    }
)
.catch(
    (error) => {

        console.error(
            "Disconnect setup error:",
            error
        );

    }
);


// =====================================================
// WATCH COMMAND STATUS
// =====================================================
//
// This is only for website display.
//
// The website does NOT keep collectionCommand
// permanently.
//

onValue(
    commandRef,
    (snapshot) => {

        if (
            snapshot.exists()
        ) {

            const command =
                snapshot.val();


            if (
                command.action === "start"
            ) {

                statusText.textContent =
                    "COLLECTING";

            }

        }

        else {

            // Command disappeared.
            // This normally means ESP32 consumed it
            // or website disconnected.

            if (!isCollecting) {

                statusText.textContent =
                    "READY";

            }

        }

    }
);


// =====================================================
// REALTIME DATA DISPLAY
// =====================================================

onValue(
    dataRef,
    (snapshot) => {

        sensorTable.innerHTML =
            "";


        // =================================================
        // NO DATA
        // =================================================

        if (
            !snapshot.exists()
        ) {

            sensorTable.innerHTML = `

                <tr class="empty-row">

                    <td colspan="5">
                        Waiting for realtime data...
                    </td>

                </tr>

            `;

            return;

        }


        // =================================================
        // RECORD ARRAY
        // =================================================

        let records = [];


        // =================================================
        // READ DATE
        // =================================================

        snapshot.forEach(
            (dateSnap) => {

                const date =
                    dateSnap.key;


                // =========================================
                // READ TIME
                // =========================================

                dateSnap.forEach(
                    (timeSnap) => {

                        const time =
                            timeSnap.key;


                        const value =
                            timeSnap.val();


                        records.push({

                            date:
                                date,

                            time:
                                time,

                            float:
                                value.float,

                            int:
                                value.int,

                            string:
                                value.string

                        });

                    }
                );

            }
        );


        // =================================================
        // NEWEST FIRST
        // =================================================

        records.reverse();


        // =================================================
        // DISPLAY
        // =================================================

        records.forEach(
            (item, index) => {

                const row =
                    document.createElement(
                        "tr"
                    );


                // Newest record highlighted
                if (
                    index === 0
                ) {

                    row.classList.add(
                        "newest"
                    );

                }


                row.innerHTML = `

                    <td>
                        ${item.date ?? ""}
                    </td>

                    <td>
                        ${item.time ?? ""}
                    </td>

                    <td>
                        ${item.float ?? ""}
                    </td>

                    <td>
                        ${item.int ?? ""}
                    </td>

                    <td>
                        ${item.string ?? ""}
                    </td>

                `;


                sensorTable.appendChild(
                    row
                );

            }
        );

    }
);


// =====================================================
// PAGE HIDDEN / CLOSE
// =====================================================
//
// onDisconnect() handles the Firebase cleanup.
//
// This part stops the local browser timer.
//

window.addEventListener(
    "pagehide",
    () => {

        isCollecting =
            false;


        if (timer !== null) {

            clearInterval(timer);

            timer = null;

        }


        statusText.textContent =
            "OFFLINE";

    }
);


// =====================================================
// INITIAL STATUS
// =====================================================

statusText.textContent =
    "READY";
