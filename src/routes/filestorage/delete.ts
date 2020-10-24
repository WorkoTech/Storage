const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

import {
    deleteMinioFile,
    validate,
    fetchUserWorkspacePermission,
    haveWriteAccess,
    notifyUsers,
    sendBillingEvent,
    BillingEvent
} from '../../utils';
import { HttpError } from '../../errors';
import { FileStorage } from '../../models/FileStorage.model';


// ROUTE DELETE /document/{id}
router.delete(
    '/:fileId',
    (req, res, next) => {
        // EXTRACT JWT
        const rawToken = req.header('Authorization') || '';
        const splitedToken = rawToken.split(' ').map(x => x.trim())
        if (splitedToken.length < 2) {
            next(new HttpError(401, 'Unauthorized'));
            return;
        }
        const token = jwt.decode(splitedToken[1]);

        // VALIDATE REQUEST
        if (!validate(req)) {
            next(new HttpError(400, 'Invalid request'));
            return;
        }

        const fileId = req.param('fileId');
        FileStorage.findByPk(fileId).then(
            filestorage => {
                if (!filestorage) {
                    next(new HttpError(404, 'File not found'))
                    return;
                }
                return fetchUserWorkspacePermission(
                    rawToken,
                    filestorage.workspaceId
                ).then(
                    permission => {
                        console.log('In then permission');
                        if (!haveWriteAccess(permission)) {
                            throw new HttpError(403, 'Forbidden');
                        }
                    }
                ).then(
                    () => filestorage
                )
            }
        ).then(
            filestorage => {
                // SEND BILLING EVENT STORAGE INCREASED
                sendBillingEvent(rawToken, BillingEvent.WORKSPACE_STORAGE_DELETED, filestorage.workspaceId, filestorage.size)
                return filestorage;
            }
        ).then(
            filestorage => {
                // SEND DELETED DOCUMENT ON SOCKET IO WORKSPACE ROOM
                notifyUsers(filestorage.workspaceId, 'filestorage deleted', filestorage)
                return filestorage;
            }
        ).then(
            filestorage => {
                const minioClient = req.app.get('minioClient');

                deleteMinioFile(
                    minioClient,
                    filestorage.bucket,
                    filestorage.objectHash
                )
                return filestorage
            }
        ).then(
            filestorage => {
                filestorage.destroy();
                res.status(204).end();
                return filestorage;
            }
        ).catch(err => {
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
