const Sequelize = require('sequelize');

export class FileStorage extends Sequelize.Model {}

export const createFileStorageModel = sequelize => {
    FileStorage.init({
        title: {
            type: Sequelize.STRING,
            allowNull: false,
        },
        workspaceId: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        authorId: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        bucket: {
            type: Sequelize.STRING,
            allowNull: false
        },
        objectHash: {
            type: Sequelize.STRING,
            allowNull: false
        },
        size: {
            type: Sequelize.INTEGER,
            allowNull: false
        }
    }, {
        sequelize
    });
}
