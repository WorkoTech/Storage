const axios = require('axios');


export enum BillingEvent {
    WORKSPACE_STORAGE_CREATED = 'WORKSPACE_STORAGE_CREATED',
    WORKSPACE_STORAGE_DELETED = 'WORKSPACE_STORAGE_DELETED'
}

export const sendBillingEvent = (
    token: string,
    event: BillingEvent,
    workspaceId: number,
    storageSize: number
): Promise<void> => {
    const url = `http://${process.env.BILLING_HOST}:${process.env.BILLING_PORT}/billing/event`;

    return axios.post(
        url,
        {
            type: event,
            workspaceId,
            storageSize
        },
        {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            },
            timeout: 1000
        }
    ).catch(err => {
        console.log('An error occured while sending billing event : ', err);
    });
}
