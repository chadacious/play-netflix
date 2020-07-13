const SHAKTI_VERSION = 'va572f159';
const UI_VERSION = `shakti-${SHAKTI_VERSION}`;
const CLIENT_VERSION = '6.0015.328.011';

const REACT_APP_ENJOY_EXTENSION_ID = 'bebnhildgpjjkldddapclelgaapgfjmj';

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

let defaultEsn = "NFCDCH-01-" + generateEsn();

const manifestUrl = "https://www.netflix.com/nq/msl_v1/cadmium/pbo_manifests/^1.0.0/router";
const licenseUrl = "https://www.netflix.com/nq/msl_v1/cadmium/pbo_licenses/^1.0.0/router";
const shaktiMetadataUrl = `https://www.netflix.com/api/shakti/${SHAKTI_VERSION}/metadata?movieid=`;
const profiles = [
    "playready-h264mpl30-dash",
    "playready-h264mpl31-dash",
    "playready-h264mpl40-dash",
    'playready-h264hpl30-dash',
    'playready-h264hpl31-dash',
    'playready-h264hpl40-dash',
    "heaac-2-dash",
    'heaac-2hq-dash',
    "simplesdh",
    "nflx-cmisc",
    "BIF240",
    "BIF320",
    'vp9-profile0-L21-dash-cenc',
    'vp9-profile0-L30-dash-cenc'
];


// const m = {
//     drmType: 'widevine',
//     isBranching: False, 
//     flavor: 'PRE_FETCH',
//     supportsWatermark: True,
//     uiVersion: 'shakti-va572f159', 
//     clientVersion: '6.0024.204.011',
//     videoOutputInfo: [{
//         type: 'DigitalVideoOutputDescriptor', 
//         outputType: 'unknown',
//         isHdcpEngaged: 0,
//         supportedHdcpVersions: []
//     }],
//     viewableId: [80178788], 
//     uiPlatform: u'SHAKTI', u'type': u'standard', u'isNonMember': False, u'showAllSubDubTracks': False, u'usePsshBox': True, u'desiredVmaf': u'plus_lts', u'isUIAutoPlay': False, u'preferAssistiveAudio': False, 
// profiles: [u'heaac-2-dash', u'heaac-2hq-dash', u'BIF240', u'BIF320', u'playready-h264mpl30-dash', u'playready-h264mpl31-dash', u'playready-h264mpl40-dash',
// u'playready-h264hpl30-dash', u'playready-h264hpl31-dash', u'playready-h264hpl40-dash', u'webvtt-lssdh-ios8', u'vp9-profile0-L21-dash-cenc', u'vp9-profile0-L30-dash-cenc', u'vp9-profile0-L31-dash-cenc', u'vp9-profile0-L40-dash-cenc', u'vp9-profile2-L30-dash-cenc-prk', u'vp9-profile2-L31-dash-cenc-prk', u'vp9-profile2-L40-dash-cenc-prk', u'vp9-profile2-L50-dash-cenc-prk', u'vp9-profile2-L51-dash-cenc-prk', u'ddplus-2.0-dash', u'ddplus-5.1-dash', u'ddplus-5.1hq-dash', u'ddplus-atmos-dash'], u'imageSubtitleHeight': 1080, u'supportsPreReleasePin': True, u'drmVersion': 25, u'supportsUnequalizedDownloadables': True, u'titleSpecificData': {u'80178788': {u'unletterboxed': True}}, u'useHttpsStreams': True}


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

const netflixFetch = async ({ url, request, mode }) => {
    let resJson;

    if (window.Android) {
        console.log('the request object', request);
        // if (request.body) {
        //     request.body = request.body.replace(/"/g, "&quot;");
        // }
        
        console.log('the request object', JSON.stringify(request));
        window.Android.sendMSLRequest(url, mode, JSON.stringify(request));
        resJson = await new Promise((resolve) => {
            const onMSLResponse = (event) => {
                window.removeEventListener("message", onMSLResponse, false);
                // console.log('event.origin, window.location.origin', event);
                if (event.origin === window.location.origin) {
                    console.log(event.data);
                    let res;
                    if (mode === 'text') {
                        console.log('The mode is text:', event.data);
                        res = event.data;
                    // } else if (mode === 'arraybuffer') { 
                    //     res = event.data;
                    } else {
                        res = JSON.parse(event.data);
                    }
                    resolve(res);
                }
            };
            window.addEventListener("message", onMSLResponse, false);
        })
    } else {
        try {
            resJson = await new Promise((resolve) => {
                const onMessageReceived = (res) => {
                    // console.log(res.data);
                    window.removeEventListener("message", onMessageReceived, false);
                    resolve(res.data);
                };
                window.addEventListener("message", onMessageReceived, false);
                console.log('The netflix request is', {
                    url,
                    mode,
                    ...request,
                });
                window.chrome.runtime.sendMessage(
                    REACT_APP_ENJOY_EXTENSION_ID,
                    {
                        MSLRequest: {
                            url,
                            mode,
                            ...request,
                        }
                    },
                    (res) => {
                        console.log('got the body response', res);
                        resolve(res);
                    }
                );
            });
        } catch (error) {
            console.log('Attempt to notify Enjoy Chrome extension failed. Perhaps extension is not running'
                + ' or an unsupported browser is being used.', error);
        }
    }
    return resJson;
};

const getViewableId = async (viewableIdPath) => {
    console.log("Getting video metadata for ID " + viewableIdPath);

    // const apiResp = await fetch(
    //     shaktiMetadataUrl + viewableIdPath,
    //     {
    //         credentials: "same-origin",
    //         method: "GET"
    //     }
    // );
    const apiJson = await netflixFetch({ url: shaktiMetadataUrl + viewableIdPath, request: { credentials: "same-origin", method: "GET" } });
    // try {
    //     apiJson = await new Promise((resolve) => {
    //         const onMessageReceived = (res) => {
    //             console.log(res.data);
    //             window.removeEventListener("message", onMessageReceived, false);
    //             resolve(res.data);
    //         };
    //         window.addEventListener("message", onMessageReceived, false);
    //         window.chrome.runtime.sendMessage(
    //             REACT_APP_ENJOY_EXTENSION_ID,
    //             {
    //                 MSLRequest: {
    //                     url: shaktiMetadataUrl + viewableIdPath,
    //                     credentials: "same-origin",
    //                     method: "GET"
    //                 }
    //             },
    //             (res) => {
    //                 console.log('got the body response', res);
    //                 resolve(res);
    //             }
    //         );
    //     });
    // } catch (error) {
    //     console.log('Attempt to notify Enjoy Chrome extension failed. Perhaps extension is not running'
    //         + ' or an unsupported browser is being used.', error);
    // }


    // const apiJson = await apiResp.json();
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

    header.capabilities = {
        languages: ['en-US'],
        compressionalgos: []
    };

    header.renewable = true;
    header.messageid = messageid;

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
    headerenvelope.signature = "";

    const payload = {
        "signature": ""
    };

    payload.payload = btoa(JSON.stringify({
        "sequencenumber": 1,
        "messageid": messageid,
        "endofmsg": true,
        "data": ""
    }));

    // console.log('the key exchange header envelop', headerenvelope);
    // console.log('the key exchange header data', header);
    // console.log('the key exchange payload', JSON.stringify({
    //     "sequencenumber": 1,
    //     "messageid": messageid,
    //     "endofmsg": true,
    //     "data": ""
    // }));

    const request = JSON.stringify(headerenvelope) + JSON.stringify(payload);
    console.log('the key exchange request', request);
    const handshakeJson = await netflixFetch({ url: manifestUrl, request: { body: request, method: "POST" } });
    // let handshakeJson;
    // try {
    //     handshakeJson = await new Promise((resolve) => {
    //         const onMessageReceived = (res) => {
    //             console.log(res.data);
    //             window.removeEventListener("message", onMessageReceived, false);
    //             resolve(res.data);
    //         };
    //         window.addEventListener("message", onMessageReceived, false);
    //         window.chrome.runtime.sendMessage(
    //             REACT_APP_ENJOY_EXTENSION_ID,
    //             {
    //                 MSLRequest: {
    //                     url: manifestUrl,
    //                     body: request,
    //                     method: "POST"
    //                 }
    //             },
    //             (res) => {
    //                 console.log('got the body response', res);
    //                 resolve(res);
    //             }
    //         );
    //     });
    // } catch (error) {
    //     console.log('Attempt to notify Enjoy Chrome extension failed. Perhaps extension is not running'
    //         + ' or an unsupported browser is being used.', error);
    // }

    // const handshakeResp = await fetch(
    //     manifestUrl,
    //     {
    //         body: request,
    //         method: "POST"
    //     }
    // );

    // const handshakeJson = await handshakeResp.json();
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

    if (!decrypted.result || (decrypted.result.length > 0 && decrypted.result[0].error)) {
        console.error(decrypted);
        throw new Error("Error parsing decrypted data", decrypted.result[0].error.detail);
    }

    return decrypted.result;
}

// const manifestChallenge = 'CAESwQsKhgsIARLsCQqvAggCEhGN3Th6q2GhvXw9bD+X9aW2ChjQ8PLmBSKOAjCCAQoCggEBANsVUL5yI9KUG1TPpb1A0bzk6df3YwbpDEkh+IOj52RfnKyspASRN1JQvCRrKwiq433M9BV+8ZkzkheYEPZ9X5rl5YdkwpqedzdZRAiuaVp/mMA5zUM3I3fZogVxGnVzh4mB2URg+g7TFwbPWz2x1uzPumO+2ImOPIUyR7auoOKrZml308w8Edwdd1HwFyrJEZHLDN2P51PJhVrUBWUlxebY05NhfIUvWQ/pyXAa6AahTf7PTVow/uu1d0vc6gHSxmj0hodvaxrkDcBY9NoOH2XCW7LNJnKC487CVwCHOJC9+6fakaHnjHepayeGEp2JL2AaCrGGqAOZdG8F11Pa0H8CAwEAASirbxKAAmFqOFvUp7caxO5/q2QK5yQ8/AA5E1KOQJxZrqwREPbGUX3670XGw9bamA0bxc37DUi6DwrOyWKWSaW/qVNie86mW/7KdVSpZPGcF/TxO+kd4iXMIjH0REZst/mMJhv5UMMO9dDFGR3RBqkPbDTdzvX1uE/loVPDH8QEfDACzDkeCA1P0zAcjWKGPzaeUrogsnBEQN4wCVRQqufDXkgImhDUCUkmyQDJXQkhgMMWtbbCHMa/DMGEZAhu4I8G32m8XxU3NoK1kDsb+s5VUgOdkX3ZnFw1uf3niQ9FCTYlzv4SIBJGEokJjkHagT6kVWfhsvSHMHzayKb00OwIn/6NsNEatAUKrgIIARIQiX9ghrmqxsdcq/w8cprG8Bj46/LmBSKOAjCCAQoCggEBALudF8e+FexCGnOsPQCNtaIvTRW8XsqiTxdo5vElAnGMoOZn6Roy2jwDkc1Gy2ucybY926xk0ZP2Xt5Uy/atI5yAvn7WZGWzbR5BbMbXIxaCyDysm7L+X6Fid55YbJ8GLl2/ToOY2CVYT+EciaTj56OjcyBJLDW/0Zqp25gnda61HwomZOVLoFmLbeZtC5DjvEv8c2NIDXXketqd/vj0I1nWKtEy8nKIPw/2nhitR6QFUnfEb8hJgPgdTApTkxWm4hSpWsM0j8CQOYNzDL2/kfP1cYw0Fh7oJMSEt2H6AUjC4lIkp54rPHAhLYE+tmwKSYfrmjEoTVErcIjl6jEvwtsCAwEAASirbxKAA0OHZIfwXbTghTVi4awHyXje/8D5fdtggtTa0Edec0KmZbHwBbLJ9OCBc9RrRL8O4WgQPG/5RVLc9IsR9x/Gw1vg/X+MmWEBnY62XNdVAUjbYGwRQuHQFMkwEQdzxfcH9oWoJtOZdLEN2X/pWs7MeM4KZc8gTUqcDHekq1QqKNs+Voc8Q5hIX7fims9llY/RUHNatDPFVuEyJ0Vqx5l+Rrrdqk+b1fXuVR6yxP1h4S/C/UtedUyZxZgc/1OJ0mLr5x1tkRbFVyzA8Z/qfZeYq3HV4pAGg7nLg0JRBTbjiZH8eUhr1JtwLiudU9vLvDnv1Y6bsfaT62vfLOttozSZVIeWo7acZHICduOL/tH1Kx7f6e7ierwQYAOng1LGs/PLofQ874C1AtNkN0tVe6cSSAvN+Vl33GbICXpX6Rq8LBPqqhzGMGBMiybnmXqOaXz8ngSQCiXqp/ImaOKfx8OE6qH92rUVWgw68qBy9ExEOl95SSEx9A/B4vEYFHaHwzqh2BoYChFhcmNoaXRlY3R1cmVfbmFtZRIDYXJtGhYKDGNvbXBhbnlfbmFtZRIGR29vZ2xlGhcKCm1vZGVsX25hbWUSCUNocm9tZUNETRoZCg1wbGF0Zm9ybV9uYW1lEghDaHJvbWVPUxojChR3aWRldmluZV9jZG1fdmVyc2lvbhILNC4xMC4xNjEwLjYyCAgBEAAYACABEiwKKgoUCAESEAAAAAAD0mdJAAAAAAAAAAAQARoQA5cwqbEo4TSV6p1qQZy26BgBIOSrw/cFMBUagAIp7zGUC9p3XZ9sp0w+yd6/wyRa1V22NyPF4BsNivSEkMtcEaQiUOW+LrGhHO+RrukWeJlzVbtpai5/vjOAbsaouQ0yMp8yfpquZcVkpPugSOPKu1A0W5w5Ou9NOGsMaJi6+LicGxhS+7xAp/lv/9LATCcQJXS2elBCz6f6VUQyMOPyjQYBrH3h27tVRcsnTRQATcogwCytXohKroBGvODIYcpVFsy2saOCyh4HTezzXJvgogx2f15ViyF5rDqho4YsW0z4it9TFBT0OOLkk0fQ6a1LSqA49eN3RufKYq4LT+G+ffdgoDmKpIWS3bp7xQ6GeYtDAUh0D8Ipwc8aKzP2';

export const getManifestAndroid = async (showUrl, esn = defaultEsn) => {
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
            "viewableId": [viewableId],
            "profiles": profiles,
            "flavor": "STANDARD",
            "drmType": "widevine",
            "drmVersion": 25,
            "usePsshBox": true,
            "isBranching": false,
            // "isUIAutoPlay": false,
            "useHttpsStreams": true,
            "imageSubtitleHeight": 720,
            'uiPlatform': 'SHAKTI',
            // "desiredVmaf": "plus_lts",
            "uiVersion": UI_VERSION,
            "clientVersion": CLIENT_VERSION,
            "supportsPreReleasePin": true,
            "supportsWatermark": true,
            "showAllSubDubTracks": false,
            'supportsUnequalizedDownloadables': true,
            // 'challenge': manifestChallenge,
            'titleSpecificData': {
                [viewableId]: {
                    'unletterboxed': true
                }
            },
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

    console.log('the manifest request data', manifestRequestData);

    header.userauthdata = {
        "scheme": "NETFLIXID",
        "authdata": {}
    };
    // header.userauthdata = {
    //     "scheme": "EMAIL_PASSWORD",
    //     "authdata": {
    //         "email": "media@medlor.com",
    //         "password": "$MeDia1!"
    //     }
    // };

    const encryptedManifestRequest = await generateMslRequestData(manifestRequestData);

    // console.log(`let manifestResp = await fetch(
    //     ${manifestUrl},
    //     {
    //         body: ${encryptedManifestRequest},
    //         credentials: "same-origin",
    //         method: "POST",
    //         headers: {"Content-Type": "application/json"}
    //     }
    // );`);
    const manifestResp = await netflixFetch({
        url: manifestUrl,// + '?reqAttempt=1&reqPriority=0&reqName=prefetch/manifest',
        mode: 'text',
        request: { body: encryptedManifestRequest, credentials: "same-origin", method: "POST", headers: {"Content-Type": "application/json"} }
    });
    
    // let manifestResp = await fetch(
    //     manifestUrl,
    //     {
    //         body: encryptedManifestRequest,
    //         credentials: "same-origin",
    //         method: "POST",
    //         headers: {"Content-Type": "application/json"}
    //     }
    // );
    // const manifestResp = manifestJson;
    // console.log(manifestResp);
    // manifestResp = await manifestResp.text();
    const manifest = await decryptMslResponse(manifestResp);

    console.log("Manifest:");
    console.log(manifest);

    licensePath = manifest.links.license.href;

    return manifest;
}

export const getLicenseAndroid = async (challenge, sessionId) => {
    const licenseRequestData = {
        "version": 2,
        "url": licensePath,
        "echo": "drmSessionId",
        "id": Date.now(),
        "esn": defaultEsn,
        "languages": [localeId],
        "uiVersion": UI_VERSION,
        "clientVersion": CLIENT_VERSION,
        "params": [{
            "drmSessionId": sessionId,
            "clientTime": Math.floor(Date.now() / 1000),
            "challengeBase64": challenge,
            "xid": Math.floor((Math.floor(Date.now() / 1000) + 0.1612) * 1000)
        }]
    };
    console.log('licenseRequestData', licenseRequestData);

    // [{u'clientTime': 1593568572, u'drmSessionId': u'87B6918474B915387CE4C574231FE660', u'xid': '15935685728210', u'challengeBase64': u'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'}]

    const encryptedLicenseRequest = await generateMslRequestData(licenseRequestData);

    const licenseResp = await netflixFetch({
        url: licenseUrl + '?reqAttempt=1&reqPriority=0&reqName=prefetch/license',
        mode: 'text',
        request: { body: encryptedLicenseRequest, credentials: "same-origin", method: "POST", headers: {"Content-Type": "application/json"} }
    });
    
    // let licenseResp = await fetch(
    //     licenseUrl,
    //     {
    //         body: encryptedLicenseRequest,
    //         credentials: "same-origin",
    //         method: "POST",
    //         headers: {"Content-Type": "application/json"}
    //     }
    // );

    // licenseResp = await licenseResp.text();
    const license = await decryptMslResponse(licenseResp);
    
    // console.log("License:", license);
    // console.log("License Buffer:", licenseResp);

    return license[0].licenseResponseBase64;
}