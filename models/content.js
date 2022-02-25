'use strict'
import { Model } from 'sequelize'
export default (sequelize, DataTypes) => {
  class Content extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate({ Wiki, Category, User, Image, Metadata }) {
      // define association here
      this.belongsTo(Wiki, { foreignKey: 'WikiWId' })
      this.hasMany(Category, {
        foreignKey: 'ContentIId',
      })
      this.hasMany(Image, {
        foreignKey: 'ContentIId',
      })
      this.hasMany(Tag, {
        foreignKey: 'ContentIId',
      })
      this.hasMany(Metadata, {
        foreignKey: 'ContentIId',
      })
      this.hasOne(User, {
        foreignKey: 'ContentIId',
      })
    }
  }
  class Content extends Model {}
  Content.init(
    {
      cId: DataTypes.INTEGER,
    },
    { sequelize, modelName: 'content' },
  )
  return Content
}
