module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Contents', {
      cId: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      created_at: Sequelize.INTEGER,
      lastModified: Sequelize.INTEGER,
      title: Sequelize.STRING,
      content: {
        type: Sequelize.STRING(1000),
      },
      WikiWId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Wikis',
          key: 'wId',
        },
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('Contents')
  },
}
