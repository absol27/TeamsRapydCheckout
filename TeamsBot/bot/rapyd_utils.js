const crypto = require('crypto');
const CryptoJS = require("crypto-js");
const rp = require("request-promise-native");

const accessKey = '7436870CD17C0388E156';
const secretKey = '1a3bc584cb84ad626fa033584fd7d3fb7ffa33c80e8b3d5a09cca12e685d99b482a6c86aafc5bfa8';
const log = false;
const API_BASE_URL = "https://sandboxapi.rapyd.net"; //for production mode change to 'https://plugins.rapyd.net'
const TEST_MODE='true';//for production mode change to 'false' 

async function makeRequest(method, urlPath, body = null) {

    try {
        salt = generateRandomString(8);
        idempotency = new Date().getTime().toString();
        timestamp = Math.round(new Date().getTime() / 1000);
        signature = sign(method, urlPath, salt, timestamp, body)

        const options = {
            method: method,
            uri: API_BASE_URL+urlPath,
            json:true,
            headers: {
                'Content-Type': 'application/json',
                salt: salt,
                timestamp: timestamp,
                signature: signature,
                access_key: accessKey,
                idempotency: idempotency,
                test_mode:TEST_MODE
            },
            body:body,
            resolveWithFullResponse: true,
            simple: false,
            time: true
        }

        return await rp(options);
    }
    catch (error) {
        console.error("Error generating request options");
        throw error;
    }
}

function sign(method, urlPath, salt, timestamp, body) {

    try {
        let bodyString = "";
        if (body) {
            bodyString = JSON.stringify(body);
            bodyString = bodyString == "{}" ? "" : bodyString;
        }

        let toSign = method.toLowerCase() + urlPath + salt + timestamp + accessKey + secretKey + bodyString;
        log && console.log(`toSign: ${toSign}`);

        let hash = crypto.createHmac('sha256', secretKey);
        hash.update(toSign);
        const signature = Buffer.from(hash.digest("hex")).toString("base64")
        log && console.log(`signature: ${signature}`);

        return signature;
    }
    catch (error) {
        console.error("Error generating signature");
        throw error;
    }
}

function generateRandomString(size) {
    try {
        return crypto.randomBytes(size).toString('hex');
    }
    catch (error) {
        console.error("Error generating salt");
        throw error;
    }
}

function isSignatureValid(req){
    if(!req.headers || !req.headers.salt || !req.headers.timestamp || !req.headers.accesskey || !req.body){
        return false;
    }
    const body = req.body;
    const http_method = 'post';
    const path = '/v1/plugins/woocommerce/payments/toolkit';
    const salt = req.headers.salt;
    const timestamp = req.headers.timestamp;
    const access_key = req.headers.accesskey;;
    const secret_key = secretKey;

    const body_string = JSON.stringify(body);

    const to_sign = http_method + path +salt + timestamp + access_key + secret_key + body_string;

    let signature = CryptoJS.enc.Hex.stringify(CryptoJS.HmacSHA256(to_sign, secret_key));
    signature = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(signature));

    if (req.headers.signature == signature) {
        return true;
    }
    return false;
}
// let body={
//     currency:'SGD',//supported currency - for example "EUR",
//     country:'SG',//supported country code - for example "AT",
//     amount:100//for example - 10,
//   };
// makeRequest('POST', '/v1/checkout', body).then((response) => {
//     // if(response && response.body){
//         console.log(response.body.data.redirect_url)
//         // taskInfo.url = taskInfo.fallbackUrl = checkout_id
//     // }
//   })

module.exports = {
    makeRequest,
    isSignatureValid
};