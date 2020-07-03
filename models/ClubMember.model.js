const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const clubMemberSchema = new Schema({
    members : [
        {
            name : {type:String,required:true},
            position : {type:String},
            roll_num : {type:String},
            email_id: {type:String},
            contact : {type:Number}
        }
    ],
    owner : {
        type:Schema.Types.ObjectId,
        required : true,
        ref : 'Club_Heads'
    }
},{
    timestamps:true
});

const ClubMembers = mongoose.model('ClubMembers',clubHeadSchema);

module.exports = ClubMembers;