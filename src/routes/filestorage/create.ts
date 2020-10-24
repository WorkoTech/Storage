const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');

import {
    validate,
    fetchUserWorkspacePermission,
    haveWriteAccess,
    notifyUsers,
    uploadFileToMinio,
    sendBillingEvent,
    BillingEvent
} from '../../utils';
import { HttpError } from '../../errors';
import * as minio from 'minio';
import { v4 as uuid } from 'uuid';

import { FileStorage } from '../../models/FileStorage.model';

// ROUTE POST /filestorage
router.post(
    '/',
    [
        body('title').exists().trim(),
        body('workspaceId').exists().isNumeric()
    ],
    (req, res, next) => {
        // EXTRACT JWT
        const rawToken = req.header('Authorization') || '';
        const splitedToken = rawToken.split(' ').map(x => x.trim())
        if (splitedToken.length < 2) {
            next(new HttpError(403, 'Forbidden'));
            return;
        }
        const token = jwt.decode(splitedToken[1]);

        // VALIDATE REQUEST
        console.log("GOT REQ.FILES : ", req.files);
        if (!validate(req) || !req.files || Object.keys(req.files).length === 0) {
            console.log("INVALID REQUEST : !validate() : ", !validate(req));
            next(new HttpError(400, 'Invalid request'));
            return;
        }

        const filestorage = req.body;
        const file = req.files[Object.keys(req.files)[0]];

        // CHECK USER PERM ON WORKSPACE
        fetchUserWorkspacePermission(
            rawToken,
            req.body.workspaceId
        ).then(
            permission => {
                if (!haveWriteAccess(permission)) {
                    next(new HttpError(401, 'Unauthorized'));
                    return;
                }

                // CREATE DOCUMENT
                filestorage.size = file.size;
                filestorage.authorId = token.userId;
                return filestorage;
            }
        ).then(
            // STORE FILE IN MINIO
            filestorage => {
                const minioClient = req.app.get('minioClient');

                filestorage.bucket = `workspace-${req.body.workspaceId}`;
                filestorage.objectHash = uuid();
                return uploadFileToMinio(
                    minioClient,
                    filestorage.bucket,
                    filestorage.objectHash,
                    file
                ).then(() => filestorage);
            }
        ).then(
            // STORE FILE METADATA IN DB
            filestorage => {
                console.log("STORING FILESTORAGE : ", filestorage);
                return FileStorage.create(filestorage).catch(err => {
                    console.error("ERR : ", err);
                    throw new HttpError(400, err.original.detail);
                });
            }
        ).then(
            filestorage => {
                // SEND CREATED DOCUMENT ON SOCKET IO WORKSPACE ROOM
                notifyUsers(filestorage.workspaceId, 'filestorage created', filestorage)
                return filestorage;
            }
        ).then(
            filestorage => {
                // SEND BILLING EVENT STORAGE INCREASED
                sendBillingEvent(rawToken, BillingEvent.WORKSPACE_STORAGE_CREATED, filestorage.workspaceId, filestorage.size)
                return filestorage;
            }
        ).then(
            filestorage => {
                // HTTP RESPONSE
                res.status(200).json(filestorage);
                return filestorage
            }
        )
        .catch(err => {
            if (err instanceof HttpError) {
                next(err);
            } else {
                // UNEXPECTED ERROR
                console.error('Unexpected error : ', err);
                next(new HttpError(500, 'Internal Server Error'));
            }
        });
});

export default router;
