const { Model } = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
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
  User.init(
    {
      uId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: 'User',
    },
  )
  return User
}
