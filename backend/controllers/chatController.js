const Chat = require("../models/Chat");
const User = require("../models/User");

const accessChat = (async(req,res)=>{
    const {userId} = req.body;

    if(!userId){
        console.log("UserId param not request");
        return res.sendStatus(400);
    }

    let isChat = await Chat.find({
        isGroupChat: false,
        $and: [
            {users:{$elemMatch:{$eq:req.user._id}}},
            {users:{$elemMatch:{$eq:userId}}},
        ]
    }).populate("users","-password").populate("latestMessage");

    isChat = await User.populate(isChat,{
        path: "latestMessage.sender",
        select:"name pic email"
    });

    if(isChat.length>0){
        res.send(isChat[0])
    }
    else{
        let chatInfo = {
            chatName: "sender",
            isGroupChat: false,
            users: [req.user._id, userId]
        };
        
        try {
            const createdChat = await Chat.create(chatInfo);

            const fullChat = await Chat.findOne({
                _id:createdChat._id
            }).populate("users","-password");

            res.status(200).send(fullChat);
        } catch (error) {
            res.status(400);
            throw new Error(error.message)
        }
    }
});

const getChats = (async (req,res)=>{
    try {
        Chat.find({
            users: {$elemMatch: {$eq: req.user._id}}}).
            populate("users", "-password")
            .populate("groupAdmin", "-password")
            .populate("latestMessage")
            .sort({updatedAt: -1})
            .then(async(results)=>{
                results = await User.populate(results,{
                    path: "latestMessage.sender",
                    select: "name pic email"
                });

                res.status(200).send(results)
            })
        
    } catch (error) {
        res.status(400);
        throw new Error(error.message)
  
    }
})

const createGroupChat = (async(req,res)=>{
    if (!req.body.users || !req.body.name){
        return res.status(400).send("Please fill all the fields");
    }

    let users = JSON.parse(req.body.users);

    if(users.length < 2){
        return res.status(400).send("The Group needs more than 2 users")
    }
    users.push(req.user);

    try {
        const groupChat = await Chat.create({
            chatName: req.body.name,
            users: users,
            isGroupChat: true,
            groupAdmin: req.user,
        });

        const finalGroupChat = await Chat.findOne({ _id: groupChat._id}).
        populate("users", "-password").
        populate("groupAdmin", "-password");

        res.status(200).send(finalGroupChat)
    } catch (error) {
        res.status(400);
        throw new Error(error.message)
    }

})
const renameGroup = (async(req,res)=>{
    const {chatId, chatName} = req.body;

    const updatedChat = await Chat.findByIdAndUpdate(
        chatId,
        {
            chatName
        },
        {
           new: true 
        }
    )
    .populate("users", "-password")
    .populate("groupAdmin", "-password")

    if(!updatedChat){
        res.status(404);
        throw new Error("Chat not found");
    }
    else{
        res.status(200).json(updatedChat)
    }
})

const addToGroup = (async(req,res)=>{

    const {chatId, userId} = req.body;

    const added = await Chat.findByIdAndUpdate(chatId,
        {
        $push: {users: userId}
        },
        {new: true}
    )
    .populate("users", "-password")
    .populate("groupAdmin", "-password")

    if(!added){
        res.status(404);
        throw new Error("Chat not found");
    }
    else{
        res.status(200).json(added)
    }

})
const removeFromGroup = (async(req,res)=>{
    const {chatId, userId} = req.body;

    const removed = await Chat.findByIdAndUpdate(chatId,
        {
        $pull: {users: userId}
        },
        {new: true}
    )
    .populate("users", "-password")
    .populate("groupAdmin", "-password")

    if(!removed){
        res.status(404);
        throw new Error("Chat not found");
    }
    else{
        res.status(200).json(removed)
    }


})

module.exports ={accessChat, getChats, createGroupChat, renameGroup, addToGroup, removeFromGroup}