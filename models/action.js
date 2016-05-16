module.exports = function(sequelize, DataTypes) {
  return sequelize.define('action', {
    alarmTime: { type: DataTypes.STRING, allowNull: true },
    completed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    completionDate: { type: DataTypes.STRING, allowNull: true },
    contactCompany: { type: DataTypes.STRING, allowNull: true },
    contactDomain: { type: DataTypes.STRING, allowNull: true },
    contactEmail: { type: DataTypes.STRING, allowNull: true },
    contactFirstName: { type: DataTypes.STRING, allowNull: true },
    contactLastName: { type: DataTypes.STRING, allowNull: true },
    contactNotes: { type: DataTypes.STRING, allowNull: true },
    contactPhone: { type: DataTypes.STRING, allowNull: true },
    contactPhoto: { type: DataTypes.STRING, allowNull: true },
    description: { type: DataTypes.STRING, allowNull: true },
    dueDate: { type: DataTypes.STRING, allowNull: false },
    isAlarmed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    isRecurring: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    isStarred: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
  });
};