// Express
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const errorhandler = require('errorhandler');
const fileUpload = require('express-fileupload');

// Sequelize
const Sequelize = require('sequelize');

import { createFileStorageModel } from './models/FileStorage.model';

import {
    devErrorHandler,
    productionErrorHandler,
    notFoundErrorHandler
} from './errors';

import {
    getPostgresUri
} from './utils';

import routes from './routes';

// Minio
import * as minio from 'minio';


const isProduction = process.env.NODE_ENV === 'production';
const app = express();

let pgConnexionTry = 0;
const initSequelize = () => {
    return new Promise((resolve, reject) => {
        const sequelize = new Sequelize(getPostgresUri());

        return sequelize.authenticate()
            .then(() => {
                console.log('Successfuly connected to PostgreSQL.');
                createFileStorageModel(sequelize);

                // TODO: check how handling migrations
                // if (!isProduction) {
                return sequelize.sync({ force: true }).then(() => resolve(sequelize));
                // }
                // return resolve(sequelize)
            })
            .catch(err => {
                console.log('Try ' + pgConnexionTry + ' : Unable to connect to postgres ( ' + err + ', retrying...');
                pgConnexionTry += 1
                return setTimeout(() => initSequelize().then(resolve).catch(reject), 2000);
            });
    });
}

const initExpress = () => {
    const app = express();

    app.use(cors()); // CORS
    app.use(morgan('dev')); // HTTP logs
    app.use(express.json()); // Only accept and parse JSON
    app.use(fileUpload()); // file upload

    app.use(routes); // Load routes
    app.use(notFoundErrorHandler); // catch 404 and forward to error handler

    // Error handlers
    if (!isProduction) {
        app.use(devErrorHandler);
    }
    app.use(productionErrorHandler);

    return new Promise((resolve, reject) => {
        const http = app.listen(process.env.STORAGE_PORT || 3000, () => {
            console.log('Express server listening on '
                + (http.address().address == '::' ? '127.0.0.1' : http.address().address)
                + ':'
                + http.address().port
                + '...'
            );

            resolve({app, http});
        });
    });
}

initSequelize().then(sequelize => {
    initExpress().then((express: any) => {
        express.app.set("minioClient", new minio.Client({
            endPoint: process.env.MINIO_HOST || 'minio',
            port: parseInt(process.env.MINIO_PORT) || 9000,
            useSSL: false,
            accessKey: process.env.MINIO_ACCESS_KEY || "minio",
            secretKey: process.env.MINIO_SECRET_KEY || "minio123"
        }));
    })
}).catch(err =>
    console.error("An error occured : ", err)
);
