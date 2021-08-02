const fs = require("fs");
module.exports = {
    devServer: {
        https: {
            key: fs.readFileSync('./ssl/privatekey.pem'),
            cert: fs.readFileSync( './ssl/certificate.pem')
        },
    }
}