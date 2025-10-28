import sql from "../configs/db.js";

export const getUserCreations = async (req,res)=>{
    try{

        const {userId}=req.auth();
        const creations = await sql`SELECT * FROM creations WHERE "userId"=${userId} ORDER BY created_at DESC`;
        res.json({success:true,creations:creations})

    }
    catch(err){
        res.json({success:false,message:err.message})
    }

}

export const getPublishedCreation = async (req,res)=>{
    try{
        const creations = await sql`SELECT * FROM creations WHERE publish=true ORDER BY created_at DESC`;
        res.json({success:true,creations:creations})

    }
    catch(err){
        res.json({success:false,message:err.message})
    }
}

export const toggleLikeCreation = async (req,res)=>{
    try{

        const {userId}=req.auth()
        const {id}=req.body;

        const [creation] = await sql `select * from creations where id=${id};`

        if(!creation) return res.status(401).json({success:false,message:"Invalid creation"})

        const currentLike=creation.likes;
        const userIdStr=userId.toString();
        let updatedLikes;
        let message;

        if(currentLike.includes(userIdStr)){
            updatedLikes=currentLike.filter((like)=> like!==userIdStr);
            message='Creation Unliked'
        }
        else{
            updatedLikes=[...currentLike,userId];
            message="Creation Liked";
        }

        const formatedArray=`{${updatedLikes.join(',')}}`

        await sql`update creations set likes=${formatedArray}::text[] where id=${id};`

        const [updatedCreation] = await sql`select * from creations where id=${id};`

        res.json({success:true,data:updatedCreation, message})

    }
    catch(err){
        res.json({success:false,message:err.message})
    }
}


