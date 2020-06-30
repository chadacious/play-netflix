const SHAKTI_VERSION = 'va572f159';
const UI_VERSION = `shakti-${SHAKTI_VERSION}`;
const CLIENT_VERSION = '6.0015.328.011';

let encryptionKeyData;
let signKeyData;
let sequenceNumber;
let mastertoken;
let licensePath;
let localeId;

const arrayBufferToBase64 = (buffer) => {
    var binary = "";
    var bytes = new Uint8Array( buffer );
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }

    return btoa(binary);
}

const base64ToArrayBuffer = (b64) => {
    var byteString = atob(b64);
    var byteArray = new Uint8Array(byteString.length);
    for(var i=0; i < byteString.length; i++) {
        byteArray[i] = byteString.charCodeAt(i);
    }

    return byteArray;
}

const arrayBufferToString = (buffer) =>{
    var arr = new Uint8Array(buffer);
    var str = String.fromCharCode.apply(String, arr);
    if(/[\u0080-\uffff]/.test(str)){
        throw new Error("this string seems to contain (still encoded) multibytes");
    }

    return str;
}

const padBase64 = (b64) => {
    var l = b64.length % 4;
    if (l === 2) {
        b64 += "==";
    } else if (l === 3) {
        b64 += "=";
    }

    return b64.replace(/-/g, "+").replace(/_/g, "/");
}

const generateEsn = () => {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  for (var i = 0; i < 30; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}

let defaultEsn = "NFCDCH-02-" + generateEsn();

const manifestUrl = "https://www.netflix.com/nq/msl_v1/cadmium/pbo_manifests/^1.0.0/router";
const licenseUrl = "https://www.netflix.com/nq/msl_v1/cadmium/pbo_licenses/^1.0.0/router";
const shaktiMetadataUrl = `https://www.netflix.com/api/shakti/${SHAKTI_VERSION}/metadata?movieid=`;
const profiles = [
    "playready-h264mpl30-dash",
    "playready-h264mpl31-dash",
    "playready-h264mpl40-dash",
    "heaac-2-dash",
    "simplesdh",
    "nflx-cmisc",
    "BIF240",
    "BIF320"
];

// if(use6Channels)
//     profiles.push("heaac-5.1-dash");

const messageid = Math.floor(Math.random() * 2**52);
const header = {
    "sender": defaultEsn,
    "renewable": true,
    "capabilities": {
        "languages": ["en-US"],
        "compressionalgos": [""]
    },
    "messageid": messageid,
};

const getViewableId = async (viewableIdPath) => {
    console.log("Getting video metadata for ID " + viewableIdPath);

    const apiResp = await fetch(
        shaktiMetadataUrl + viewableIdPath,
        {
            credentials: "same-origin",
            method: "GET"
        }
    );

    const apiJson = await apiResp.json();
    console.log("Metadata response:");
    console.log(apiJson);

    let viewableId = apiJson.video.currentEpisode;
    if (!viewableId) {
        viewableId = parseInt(viewableIdPath);
    }

    return viewableId;
}

const performKeyExchange = async () => {
    delete header.userauthdata;
    const keyPair = await window.crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
            hash: {name: "SHA-1"},
        },
        false,
        ["encrypt", "decrypt"]
    );

    const publicKey = await window.crypto.subtle.exportKey(
        "spki",
        keyPair.publicKey
    );

    header.keyrequestdata = [
        {
            "scheme": "ASYMMETRIC_WRAPPED",
            "keydata": {
                "publickey": arrayBufferToBase64(publicKey),
                "mechanism": "JWK_RSA",
                "keypairid": "rsaKeypairId"
            }
        }
    ];

    const headerenvelope = {
        "entityauthdata": {
            "scheme": "NONE",
            "authdata": {
                "identity": defaultEsn,
            }
        },
        "signature": "",
    };

    headerenvelope.headerdata = btoa(JSON.stringify(header));

    const payload = {
        "signature": ""
    };

    payload.payload = btoa(JSON.stringify({
        "sequencenumber": 1,
        "messageid": messageid,
        "endofmsg": true,
        "data": ""
    }));

    console.log('the key exchange header envelop', headerenvelope);
    console.log('the key exchange header data', header);
    console.log('the key exchange payload', JSON.stringify({
        "sequencenumber": 1,
        "messageid": messageid,
        "endofmsg": true,
        "data": ""
    }));

    const request = JSON.stringify(headerenvelope) + JSON.stringify(payload);
    console.log('the key exchange request', request);
    const handshakeResp = await fetch(
        manifestUrl,
        {
            body: request,
            method: "POST"
        }
    );

    const handshakeJson = await handshakeResp.json();
    if (!handshakeJson.headerdata) {
        console.error(JSON.parse(atob(handshakeJson.errordata)));
        throw new Error("Error parsing key exchange response");
    }

    const headerdata = JSON.parse(atob(handshakeJson.headerdata));
    let encryptionKeyData = await window.crypto.subtle.decrypt(
        {
            name: "RSA-OAEP",
        },
        keyPair.privateKey,
        base64ToArrayBuffer(headerdata.keyresponsedata.keydata.encryptionkey)
    );

    encryptionKeyData = JSON.parse(arrayBufferToString(encryptionKeyData));

    let signKeyData = await window.crypto.subtle.decrypt(
        {
            name: "RSA-OAEP",
        },
        keyPair.privateKey,
        base64ToArrayBuffer(headerdata.keyresponsedata.keydata.hmackey)
    );

    signKeyData = JSON.parse(arrayBufferToString(signKeyData));

    return {
        "headerdata": headerdata,
        "encryptionKeyData": encryptionKeyData,
        "signKeyData": signKeyData
    };
}

const generateMslRequestData = async (data) => {
    let iv = window.crypto.getRandomValues(new Uint8Array(16));
    let aesCbc = new window.aesjs.ModeOfOperation.cbc(
        base64ToArrayBuffer(padBase64(encryptionKeyData.k)),
        iv
    );

    let textBytes = window.aesjs.utils.utf8.toBytes(JSON.stringify(header));
    let encrypted = aesCbc.encrypt(window.aesjs.padding.pkcs7.pad(textBytes));
    let encryptionEnvelope = {
        "keyid": defaultEsn + "_" + sequenceNumber,
        "sha256": "AA==",
        "iv": arrayBufferToBase64(iv),
        "ciphertext": arrayBufferToBase64(encrypted)
    };

    let shaObj = new window.jsSHA("SHA-256", "TEXT");
    shaObj.setHMACKey(padBase64(signKeyData.k), "B64");
    shaObj.update(JSON.stringify(encryptionEnvelope));
    let signature = shaObj.getHMAC("B64");
    const encryptedHeader = {
        "signature": signature,
        "mastertoken": mastertoken
    };
    
    encryptedHeader.headerdata = btoa(JSON.stringify(encryptionEnvelope));
    
    const firstPayload = {
        "messageid": messageid,
        "data": btoa(JSON.stringify(data)),
        "sequencenumber": 1,
        "endofmsg": true
    };

    iv = window.crypto.getRandomValues(new Uint8Array(16));
    aesCbc = new window.aesjs.ModeOfOperation.cbc(
        base64ToArrayBuffer(padBase64(encryptionKeyData.k)),
        iv
    );
    
    textBytes = window.aesjs.utils.utf8.toBytes(JSON.stringify(firstPayload));
    encrypted = aesCbc.encrypt(window.aesjs.padding.pkcs7.pad(textBytes));    
    
    encryptionEnvelope = {
        "keyid": defaultEsn + "_" + sequenceNumber,
        "sha256": "AA==",
        "iv": arrayBufferToBase64(iv),
        "ciphertext": arrayBufferToBase64(encrypted)
    };

    shaObj = new window.jsSHA("SHA-256", "TEXT");
    shaObj.setHMACKey(padBase64(signKeyData.k), "B64");
    shaObj.update(JSON.stringify(encryptionEnvelope));
    signature = shaObj.getHMAC("B64");

    const firstPayloadChunk = {
        "signature": signature,
        "payload": btoa(JSON.stringify(encryptionEnvelope))
    };

    return JSON.stringify(encryptedHeader) + JSON.stringify(firstPayloadChunk);
}

export const decryptMslResponse = async (data) => {
    try {
        JSON.parse(data);
        console.error(JSON.parse(atob(JSON.parse(data).errordata)));
        throw new Error("Error parsing data");
    } catch (e) {}

    const pattern = /,"signature":"[0-9A-Za-z/+=]+"}/;
    const payloadsSplit = data.split("}}")[1].split(pattern);
    payloadsSplit.pop();
    const payloadChunks = [];
    for (var i = 0; i < payloadsSplit.length; i++) {
        payloadChunks.push(payloadsSplit[i] + "}");
    }

    let chunks = "";
    for (i = 0; i < payloadChunks.length; i++) {
        const payloadchunk = JSON.parse(payloadChunks[i]);
        const encryptionEnvelope = atob(payloadchunk.payload);
        const aesCbc = new window.aesjs.ModeOfOperation.cbc(
            base64ToArrayBuffer(padBase64(encryptionKeyData.k)),
            base64ToArrayBuffer(JSON.parse(encryptionEnvelope).iv)
        );

        const ciphertext = base64ToArrayBuffer(
            JSON.parse(encryptionEnvelope).ciphertext
        );

        const plaintext = JSON.parse(
            arrayBufferToString(
                window.aesjs.padding.pkcs7.strip(
                    aesCbc.decrypt(ciphertext)
                )
            )
        );

        chunks += atob(plaintext.data);
    }

    const decrypted = JSON.parse(chunks);

    if (!decrypted.result) {
        console.error(decrypted);
        throw new Error("Error parsing decrypted data");
    }

    return decrypted.result;
}

export const getManifest = async (showUrl, esn = defaultEsn) => {
    defaultEsn = esn;
    console.log("Performing key exchange");
    const keyExchangeData = await performKeyExchange();
    console.log("Key exchange data:");
    console.log(keyExchangeData);

    const headerdata = keyExchangeData.headerdata;

    mastertoken = headerdata.keyresponsedata.mastertoken;
    encryptionKeyData = keyExchangeData.encryptionKeyData;
    signKeyData = keyExchangeData.signKeyData;
    sequenceNumber = JSON.parse(atob(mastertoken.tokendata)).sequencenumber;

    // const viewableIdPath = window.location.pathname.substring(7, 15);
    const viewableIdPath = new URL(showUrl).pathname.substring(7, 15);
    const viewableId = await getViewableId(viewableIdPath);

    localeId = "en-US";
    try {
        localeId = window.netflix.appContext.state.model.models.geo.data.locale.id;
    } catch (e) {}

    const manifestRequestData = {
        "version": 2,
        "url": "/manifest",
        "id": Date.now(),
        "esn": defaultEsn,
        "languages": [localeId],
        "uiVersion": UI_VERSION,
        "clientVersion": CLIENT_VERSION,
        "params": {
            "type": "standard",
            "viewableId": viewableId,
            "profiles": profiles,
            "flavor": "STANDARD",
            "drmType": "widevine",
            "drmVersion": 25,
            "usePsshBox": true,
            "isBranching": false,
            "useHttpsStreams": true,
            "imageSubtitleHeight": 720,
            "uiVersion": UI_VERSION,
            "clientVersion": CLIENT_VERSION,
            "supportsPreReleasePin": true,
            "supportsWatermark": true,
            "showAllSubDubTracks": false,
            "videoOutputInfo": [
                {
                    "type": "DigitalVideoOutputDescriptor",
                    "outputType": "unknown",
                    "supportedHdcpVersions": ['1.4'],
                    "isHdcpEngaged": true
                }
            ],
            "preferAssistiveAudio": false,
            "isNonMember": false
        }
    };

    header.userauthdata = {
        "scheme": "NETFLIXID",
        "authdata": {}
    };

    const encryptedManifestRequest = await generateMslRequestData(manifestRequestData);

    console.log(`let manifestResp = await fetch(
        ${manifestUrl},
        {
            body: ${encryptedManifestRequest},
            credentials: "same-origin",
            method: "POST",
            headers: {"Content-Type": "application/json"}
        }
    );`);
    let manifestResp = await fetch(
        manifestUrl,
        {
            body: encryptedManifestRequest,
            credentials: "same-origin",
            method: "POST",
            headers: {"Content-Type": "application/json"}
        }
    );

    manifestResp = await manifestResp.text();
    const manifest = await decryptMslResponse(manifestResp);

    console.log("Manifest:");
    console.log(manifest);

    licensePath = manifest.links.license.href;

    return manifest;
}

export const getLicense = async (challenge, sessionId) => {
    const licenseRequestData = {
        "version": 2,
        "url": licensePath,
        "id": Date.now(),
        "esn": defaultEsn,
        "languages": [localeId],
        "uiVersion": UI_VERSION,
        "clientVersion": CLIENT_VERSION,
        "params": [{
            "sessionId": sessionId,
            "clientTime": Math.floor(Date.now() / 1000),
            "challengeBase64": challenge,
            "xid": Math.floor((Math.floor(Date.now() / 1000) + 0.1612) * 1000)
        }],
        "echo": "sessionId"
    };

    const encryptedLicenseRequest = await generateMslRequestData(licenseRequestData);
    let licenseResp = await fetch(
        licenseUrl,
        {
            body: encryptedLicenseRequest,
            credentials: "same-origin",
            method: "POST",
            headers: {"Content-Type": "application/json"}
        }
    );

    licenseResp = await licenseResp.text();
    const license = await decryptMslResponse(licenseResp);

    console.log("License:", license);

    return license;
}