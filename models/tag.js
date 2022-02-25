'use strict'
const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class Tag extends Model {
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
  Tag.init(
    {
      tId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: 'Tag',
    },
  )
  return Tag
}
