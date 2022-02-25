import { Model } from 'sequelize'
export default (sequelize, DataTypes) => {
  class Wiki extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate({ Content }) {
      // define association here
      this.hasOne(Content, { foreignKey: 'WikiWId' })
    }
  }
  Wiki.init(
    {
      wId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: 'Wiki',
    },
  )

  return Wiki
}
