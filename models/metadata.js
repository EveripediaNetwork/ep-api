'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class Metadata extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate({ Content }) {
      // define association here
      this.belongsTo(Content, {
        foreignKey: 'ContentIId',
      })
    }
  }
  Metadata.init(
    {
      mId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: 'Metadata',
    },
  )
  return Metadata
}
