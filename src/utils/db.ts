export const getPostgresUri = (): string => {
    const user = process.env.POSTGRES_USER || 'postgres';
    const password = process.env.POSTGRES_PASSWORD || '_qWj4gaGs3S3=fyD9H5ke6';
    const host = process.env.POSTGRES_HOST || 'localhost';
    const port = process.env.POSTGRES_PORT || 5432;
    const name = process.env.POSTGRES_NAME || 'chat';

    return `postgres://${user}:${password}@${host}:${port}/${name}`
}
