const fs = require("fs");
module.exports = {
    devServer: {
        disableHostCheck: true,
        allowedHosts: [
          'jvkktkzy.xiaomy.net'
        ],
        https: {
            key: fs.readFileSync('./ssl/privatekey.pem'),
            cert: fs.readFileSync( './ssl/certificate.pem')
        },
    }
}