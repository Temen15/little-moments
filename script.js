/* =========================================================
   LITTLE MOMENTS
   Long-distance photo booth
========================================================= */


/* ================= ELEMENTS ================= */

const screens = {
    home: document.getElementById("homeScreen"),
    create: document.getElementById("createScreen"),
    waiting: document.getElementById("waitingScreen"),
    join: document.getElementById("joinScreen"),
    booth: document.getElementById("boothScreen"),
    result: document.getElementById("resultScreen")
};

const createBtn =
    document.getElementById("createBtn");

const joinBtnHome =
    document.getElementById("joinBtn");

const startCreateBtn =
    document.getElementById("startCreateBtn");

const joinRoomBtn =
    document.getElementById("joinRoomBtn");

const shareRoomBtn =
    document.getElementById("shareRoomBtn");

const copyRoomBtn =
    document.getElementById("copyRoomBtn");

const roomCodeElement =
    document.getElementById("roomCode");

const connectionText =
    document.getElementById("connectionText");

const statusDot =
    document.getElementById("statusDot");

const hostVideo =
    document.getElementById("hostVideo");

const localVideo =
    document.getElementById("localVideo");

const remoteVideo =
    document.getElementById("remoteVideo");

const remoteWaiting =
    document.getElementById("remoteWaiting");

const captureBtn =
    document.getElementById("captureBtn");

const captureHint =
    document.getElementById("captureHint");

const countdown =
    document.getElementById("countdown");

const momentTitle =
    document.getElementById("momentTitle");

const momentCounter =
    document.getElementById("momentCounter");

const promptText =
    document.getElementById("promptText");

const canvas =
    document.getElementById("canvas");

const finalStrip =
    document.getElementById("finalStrip");

const saveBtn =
    document.getElementById("saveBtn");

const shareBtn =
    document.getElementById("shareBtn");

const againBtn =
    document.getElementById("againBtn");

const captionInput =
    document.getElementById("captionInput");


/* ================= STATE ================= */

let peer = null;

let connection = null;

let localStream = null;

let currentRoom = null;

let isHost = false;

let connected = false;

let currentMoment = 0;

let photos = [];

let currentTheme = "classic";


const prompts = [
    "Give me your cutest smile ♡",
    "Okay... now be silly.",
    "Make a little heart ❤️",
    "One last one... our favorite pose."
];


/* ================= SCREEN CONTROL ================= */

function showScreen(screen) {

    Object.values(screens).forEach(
        s => s.classList.remove("active")
    );

    screen.classList.add("active");

    window.scrollTo({
        top: 0,
        behavior: "instant"
    });
}


/* ================= RANDOM ROOM CODE ================= */

function generateRoomCode() {

    const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "";

    for (let i = 0; i < 6; i++) {

        code +=
            chars[
                Math.floor(
                    Math.random() * chars.length
                )
            ];

    }

    return code;
}


/* ================= PEER ID ================= */

function generatePeerId() {

    return (
        "LM-" +
        crypto.randomUUID()
            .replaceAll("-", "")
            .slice(0, 18)
    );

}


/* ================= CAMERA ================= */

async function startCamera() {

    if (localStream) {

        return localStream;

    }

    try {

        localStream =
            await navigator.mediaDevices
                .getUserMedia({

                    video: {
                        facingMode: "user",

                        width: {
                            ideal: 1280
                        },

                        height: {
                            ideal: 720
                        }
                    },

                    audio: false

                });

        localVideo.srcObject =
            localStream;

        hostVideo.srcObject =
            localStream;

        return localStream;

    } catch (error) {

        console.error(error);

        alert(
            "Camera access is needed ❤️\n\n" +
            "On iPhone, choose Allow when Safari asks for camera permission."
        );

        throw error;
    }

}


/* ================= CREATE ROOM ================= */

createBtn.addEventListener(
    "click",
    () => {

        showScreen(screens.create);

    }
);


startCreateBtn.addEventListener(
    "click",
    async () => {

        try {

            await startCamera();

            await createRoom();

        } catch {

            // Camera error already shown.

        }

    }
);


async function createRoom() {

    isHost = true;

    currentRoom =
        generateRoomCode();

    roomCodeElement.textContent =
        currentRoom;

    connectionText.textContent =
        "Creating private room...";

    showScreen(screens.waiting);

    const peerId =
        generatePeerId();

    peer =
        new Peer(peerId, {

            debug: 1

        });


    peer.on(
        "open",
        () => {

            connectionText.textContent =
                "Waiting for her to join...";

            console.log(
                "HOST PEER:",
                peerId
            );

        }
    );


    peer.on(
        "error",
        error => {

            console.error(
                "Peer error:",
                error
            );

            if (
                error.type ===
                "network"
            ) {

                connectionText.textContent =
                    "Network problem. Refresh and try again.";

            }

        }
    );


    peer.on(
        "connection",
        conn => {

            connection =
                conn;

            setupConnection(conn);

        }
    );


    peer.on(
        "call",
        call => {

            console.log(
                "Incoming camera call"
            );

            call.answer(
                localStream
            );

            call.on(
                "stream",
                stream => {

                    remoteVideo.srcObject =
                        stream;

                    showConnected();

                }
            );

        }
    );

}


/* ================= JOIN ================= */

joinBtnHome.addEventListener(
    "click",
    () => {

        const params =
            new URLSearchParams(
                window.location.search
            );

        const room =
            params.get("room");

        if (room) {

            prepareJoin(
                room.toUpperCase()
            );

        } else {

            const code =
                prompt(
                    "Enter the 6-letter room code ❤️"
                );

            if (!code) return;

            prepareJoin(
                code
                    .trim()
                    .toUpperCase()
            );

        }

    }
);


function prepareJoin(code) {

    if (!code) return;

    currentRoom = code;

    showScreen(screens.join);

}


joinRoomBtn.addEventListener(
    "click",
    async () => {

        try {

            await startCamera();

            await joinRoom();

        } catch {

            // Error already handled.

        }

    }
);


async function joinRoom() {

    isHost = false;

    showScreen(screens.booth);

    updateMoment();

    const peerId =
        generatePeerId();

    peer =
        new Peer(peerId, {

            debug: 1

        });


    peer.on(
        "open",
        () => {

            /*
               The host's PeerJS ID is derived
               from the room code.

               We store it in the invitation URL.
            */

            const hostPeerId =
                sessionStorage.getItem(
                    "hostPeerId"
                );

            if (!hostPeerId) {

                showJoinError();

                return;

            }

            connection =
                peer.connect(
                    hostPeerId,
                    {
                        reliable: true
                    }
                );

            setupConnection(
                connection
            );


            const call =
                peer.call(
                    hostPeerId,
                    localStream
                );

            call.on(
                "stream",
                stream => {

                    remoteVideo.srcObject =
                        stream;

                    showConnected();

                }
            );

        }
    );


    peer.on(
        "error",
        error => {

            console.error(
                "Join error:",
                error
            );

            connectionText.textContent =
                "Couldn't connect to the booth.";

        }
    );

}


/* ================= CONNECTION ================= */

function setupConnection(conn) {

    connection = conn;


    conn.on(
        "open",
        () => {

            console.log(
                "Data connection opened"
            );

            showConnected();

        }
    );


    conn.on(
        "data",
        data => {

            console.log(
                "Received:",
                data
            );

            if (
                data.type ===
                "start-countdown"
            ) {

                runCountdown(
                    false
                );

            }


            if (
                data.type ===
                "new-moment"
            ) {

                currentMoment =
                    data.moment;

                updateMoment();

            }


            if (
                data.type ===
                "reset"
            ) {

                resetBooth();

            }

        }
    );


    conn.on(
        "close",
        () => {

            connected = false;

            captureBtn.disabled =
                true;

            remoteWaiting.style.display =
                "grid";

            connectionText.textContent =
                "She left the booth.";

        }
    );

}


/* ================= CONNECTED UI ================= */

function showConnected() {

    connected = true;

    remoteWaiting.style.display =
        "none";

    statusDot.classList.add(
        "connected"
    );

    connectionText.textContent =
        "Babyy is here ❤️";

    captureBtn.disabled =
        false;

    captureHint.textContent =
        "You're both ready — take the photo ❤️";

}


/* ================= SHARE ROOM ================= */

function getInviteLink() {

    /*
       We put the host PeerJS ID into
       the URL.

       This means her phone knows
       exactly which room to connect to.
    */

    const hostPeerId =
        peer?.id;

    if (!hostPeerId) {

        return null;

    }

    const base =
        window.location.origin +
        window.location.pathname;

    return (
        base +
        "?room=" +
        encodeURIComponent(
            currentRoom
        ) +
        "&host=" +
        encodeURIComponent(
            hostPeerId
        )
    );

}


shareRoomBtn.addEventListener(
    "click",
    async () => {

        const link =
            getInviteLink();

        if (!link) {

            alert(
                "Your room is still being created. Wait a moment ❤️"
            );

            return;

        }

        if (
            navigator.share
        ) {

            try {

                await navigator.share({

                    title:
                        "Our Little Moments ♡",

                    text:
                        "Come take a photo with me ❤️",

                    url: link

                });

            } catch {

                // User cancelled share.

            }

        } else {

            await copyText(link);

            alert(
                "Invitation link copied ❤️"
            );

        }

    }
);


copyRoomBtn.addEventListener(
    "click",
    async () => {

        const link =
            getInviteLink();

        if (!link) {

            alert(
                "Wait for the room to finish creating ❤️"
            );

            return;

        }

        await copyText(link);

        copyRoomBtn.textContent =
            "✓ Link copied";

        setTimeout(
            () => {

                copyRoomBtn.textContent =
                    "Copy invitation link";

            },
            2000
        );

    }
);


async function copyText(text) {

    try {

        await navigator.clipboard.writeText(
            text
        );

    } catch {

        const input =
            document.createElement(
                "textarea"
            );

        input.value = text;

        document.body.appendChild(
            input
        );

        input.select();

        document.execCommand(
            "copy"
        );

        input.remove();

    }

}


/* ================= AUTO JOIN ================= */

window.addEventListener(
    "load",
    () => {

        const params =
            new URLSearchParams(
                window.location.search
            );

        const room =
            params.get("room");

        const host =
            params.get("host");


        if (
            room &&
            host
        ) {

            /*
               Save the host PeerJS ID
               BEFORE the join button
               is pressed.
            */

            sessionStorage.setItem(
                "hostPeerId",
                host
            );

            currentRoom =
                room.toUpperCase();

            prepareJoin(
                currentRoom
            );

        }

    }
);


/* ================= PHOTO BOOTH ================= */

captureBtn.addEventListener(
    "click",
    () => {

        if (!connected) {

            alert(
                "Wait until Babyy joins ❤️"
            );

            return;

        }


        /*
           Host controls the countdown.

           This keeps both phones
           synchronized.
        */

        if (isHost) {

            if (
                connection &&
                connection.open
            ) {

                connection.send({

                    type:
                        "start-countdown"

                });

            }

            runCountdown(
                true
            );

        }

    }
);


/* ================= COUNTDOWN ================= */

async function runCountdown(
    hostTriggered
) {

    captureBtn.disabled =
        true;


    for (
        let number = 3;
        number >= 1;
        number--
    ) {

        countdown.textContent =
            number;

        countdown.classList.remove(
            "show"
        );

        void countdown.offsetWidth;

        countdown.classList.add(
            "show"
        );

        await wait(
            900
        );

    }


    countdown.textContent =
        "♡";


    countdown.classList.remove(
        "show"
    );

    void countdown.offsetWidth;

    countdown.classList.add(
        "show"
    );


    await wait(
        400
    );


    capturePhoto();


    await wait(
        900
    );


    countdown.textContent =
        "";


    if (
        currentMoment <
        3
    ) {

        currentMoment++;

        updateMoment();


        if (
            connection &&
            connection.open &&
            isHost
        ) {

            connection.send({

                type:
                    "new-moment",

                moment:
                    currentMoment

            });

        }


        captureBtn.disabled =
            false;

    } else {

        finishStrip();

    }

}


function wait(ms) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                ms
            )
    );

}


/* ================= CAPTURE ================= */

function capturePhoto() {

    /*
       We take a screenshot of both
       live video streams.

       The two sides are placed
       next to each other.
    */

    const width =
        1200;

    const height =
        800;


    const shotCanvas =
        document.createElement(
            "canvas"
        );

    shotCanvas.width =
        width;

    shotCanvas.height =
        height;


    const ctx =
        shotCanvas.getContext(
            "2d"
        );


    ctx.fillStyle =
        "#171018";

    ctx.fillRect(
        0,
        0,
        width,
        height
    );


    /*
       LEFT = YOU
       RIGHT = BABYY
    */

    if (
        localVideo.readyState >= 2
    ) {

        ctx.save();

        ctx.translate(
            width / 2,
            0
        );

        ctx.scale(
            -1,
            1
        );

        ctx.drawImage(
            localVideo,
            -width / 2,
            0,
            width / 2,
            height
        );

        ctx.restore();

    }


    if (
        remoteVideo.readyState >= 2
    ) {

        ctx.drawImage(
            remoteVideo,
            width / 2,
            0,
            width / 2,
            height
        );

    }


    /*
       Small divider.
    */

    ctx.fillStyle =
        "rgba(255,255,255,.15)";

    ctx.fillRect(
        width / 2 - 1,
        0,
        2,
        height
    );


    photos[currentMoment] =
        shotCanvas.toDataURL(
            "image/jpeg",
            .92
        );

}


/* ================= MOMENT ================= */

function updateMoment() {

    momentCounter.textContent =
        `${currentMoment + 1} / 4`;

    momentTitle.textContent =
        prompts[currentMoment];

    promptText.textContent =
        prompts[currentMoment];

}


/* ================= FINISH ================= */

function finishStrip() {

    setTimeout(
        () => {

            generateStrip();

            showScreen(
                screens.result
            );

        },
        500
    );

}


/* ================= GENERATE STRIP ================= */

function generateStrip() {

    const stripWidth =
        700;

    const photoWidth =
        620;

    const photoHeight =
        410;

    const sidePadding =
        40;

    const topPadding =
        50;

    const gap =
        20;

    const bottomArea =
        130;


    const stripHeight =
        topPadding +
        (photoHeight * 4) +
        (gap * 3) +
        bottomArea;


    canvas.width =
        stripWidth;

    canvas.height =
        stripHeight;


    const ctx =
        canvas.getContext(
            "2d"
        );


    /*
       BACKGROUND
    */

    ctx.fillStyle =
        getThemeBackground();

    ctx.fillRect(
        0,
        0,
        stripWidth,
        stripHeight
    );


    /*
       HEADER
    */

    ctx.fillStyle =
        getThemeText();

    ctx.font =
        "bold 28px Arial";

    ctx.textAlign =
        "center";

    ctx.fillText(
        "♡ LITTLE MOMENTS ♡",
        stripWidth / 2,
        32
    );


    /*
       PHOTOS
    */

    let loaded = 0;


    photos.forEach(
        (photo, index) => {

            const image =
                new Image();

            image.onload = () => {

                const y =
                    topPadding +
                    index *
                    (photoHeight + gap);


                ctx.save();

                /*
                   White photo border
                */

                ctx.fillStyle =
                    getPhotoBorder();

                ctx.fillRect(
                    sidePadding - 6,
                    y - 6,
                    photoWidth + 12,
                    photoHeight + 12
                );


                /*
                   Crop
                */

                drawCover(
                    ctx,
                    image,
                    sidePadding,
                    y,
                    photoWidth,
                    photoHeight
                );


                ctx.restore();


                loaded++;


                if (
                    loaded === photos.length
                ) {

                    drawFooter(
                        ctx,
                        stripWidth,
                        stripHeight
                    );

                    finalStrip.src =
                        canvas.toDataURL(
                            "image/jpeg",
                            .95
                        );

                }

            };

            image.src =
                photo;

        }
    );

}


/* ================= COVER DRAW ================= */

function drawCover(
    ctx,
    image,
    x,
    y,
    width,
    height
) {

    const imageRatio =
        image.width /
        image.height;

    const boxRatio =
        width /
        height;

    let sx = 0;
    let sy = 0;
    let sw = image.width;
    let sh = image.height;


    if (
        imageRatio >
        boxRatio
    ) {

        sw =
            image.height *
            boxRatio;

        sx =
            (image.width - sw) /
            2;

    } else {

        sh =
            image.width /
            boxRatio;

        sy =
            (image.height - sh) /
            2;

    }


    ctx.drawImage(
        image,
        sx,
        sy,
        sw,
        sh,
        x,
        y,
        width,
        height
    );

}


/* ================= FOOTER ================= */

function drawFooter(
    ctx,
    width,
    height
) {

    ctx.fillStyle =
        getThemeText();

    ctx.font =
        "bold 25px Arial";

    ctx.textAlign =
        "center";

    ctx.fillText(
        captionInput.value ||
        "BABYY × TEMEN",
        width / 2,
        height - 62
    );


    ctx.font =
        "17px Arial";

    ctx.fillText(
        "made from two places, kept in one memory ♡",
        width / 2,
        height - 32
    );

}


/* ================= THEMES ================= */

function getThemeBackground() {

    if (
        currentTheme ===
        "blush"
    ) {

        return "#f6dce7";

    }

    if (
        currentTheme ===
        "midnight"
    ) {

        return "#19131c";

    }

    return "#fffaf5";

}


function getThemeText() {

    if (
        currentTheme ===
        "blush"
    ) {

        return "#5d3347";

    }

    if (
        currentTheme ===
        "midnight"
    ) {

        return "#fff5fa";

    }

    return "#4b3540";

}


function getPhotoBorder() {

    if (
        currentTheme ===
        "midnight"
    ) {

        return "#eee5eb";

    }

    return "#ffffff";

}


/* ================= THEME BUTTONS ================= */

document
    .querySelectorAll(
        "[data-theme]"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    currentTheme =
                        button.dataset.theme;

                    generateStrip();

                }
            );

        }
    );


/* ================= CAPTION ================= */

captionInput.addEventListener(
    "input",
    () => {

        generateStrip();

    }
);


/* ================= SAVE ================= */

saveBtn.addEventListener(
    "click",
    () => {

        const link =
            document.createElement(
                "a"
            );

        link.download =
            "little-moments.jpg";

        link.href =
            finalStrip.src;

        link.click();

    }
);


/* ================= SHARE ================= */

shareBtn.addEventListener(
    "click",
    async () => {

        try {

            const response =
                await fetch(
                    finalStrip.src
                );

            const blob =
                await response.blob();

            const file =
                new File(
                    [blob],
                    "little-moments.jpg",
                    {
                        type:
                            "image/jpeg"
                    }
                );


            if (
                navigator.share &&
                navigator.canShare &&
                navigator.canShare({
                    files: [file]
                })
            ) {

                await navigator.share({

                    title:
                        "Our Little Moments ♡",

                    text:
                        "Look what we made together ❤️",

                    files: [file]

                });

            } else {

                saveBtn.click();

                alert(
                    "The photo strip was saved. You can share it from your Photos app ❤️"
                );

            }

        } catch (error) {

            console.error(error);

        }

    }
);


/* ================= AGAIN ================= */

againBtn.addEventListener(
    "click",
    () => {

        resetBooth();

        showScreen(
            screens.booth
        );

        updateMoment();

    }
);


/* ================= RESET ================= */

function resetBooth() {

    currentMoment = 0;

    photos = [];

    updateMoment();

    captureBtn.disabled =
        !connected;

}


/* ================= BACK BUTTONS ================= */

document
    .querySelectorAll(
        "[data-back]"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    showScreen(
                        screens.home
                    );

                }
            );

        }
    );


/* ================= JOIN ERROR ================= */

function showJoinError() {

    alert(
        "This invitation is incomplete or expired.\n\nAsk Temen to create a new booth link ❤️"
    );

    showScreen(
        screens.home
    );

}


/* ================= CLEANUP ================= */

window.addEventListener(
    "beforeunload",
    () => {

        if (localStream) {

            localStream
                .getTracks()
                .forEach(
                    track =>
                        track.stop()
                );

        }

        if (peer) {

            peer.destroy();

        }

    }
);