const Setting = require('./settings.model');
const SETTING_NAME = 'DisplayAnswers'; // Use a constant to avoid typos

const getDisplayAnswersSetting = async () => {
    let setting = await Setting.findOne({ settingName: SETTING_NAME });
    if (!setting) {
        // If the setting doesn't exist, create it with a default value.
        setting = await new Setting({
            settingName: SETTING_NAME,
            isEnabled: true,
            description: "Controls whether students can view their results after submission."
        }).save();
    }
    return setting;
};

const updateDisplayAnswersSetting = async (isEnabled) => {
    return await Setting.findOneAndUpdate(
        { settingName: SETTING_NAME },
        { isEnabled },
        { new: true, upsert: true } // `upsert: true` will create it if it doesn't exist
    );
};

module.exports = { getDisplayAnswersSetting, updateDisplayAnswersSetting };