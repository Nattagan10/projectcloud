const express=require("express")
const mongoose=require("mongoose")
const cors=require("cors")
require("dotenv").config()

const app=express()

app.use(cors())
app.use(express.json())

mongoose.connect(process.env.MONGODB_URI)
.then(()=>console.log("MongoDB connected"))
.catch(err=>console.log(err))


const itemSchema=new mongoose.Schema({

ItemName:String,

Category:String,

StockQty:Number,

ExpiryDate:Date,

DaysUntilExpiry:Number,

SuggestedAction:String

},{collection:"Items",versionKey:false})


const Item=mongoose.model("Item",itemSchema)


function calculateStatus(expiry,stock){

const today=new Date()

const exp=new Date(expiry)

const diff=Math.ceil((exp-today)/(1000*60*60*24))

let action="none"


if(diff<0){

action="drop"

}

else if(stock<=20&&diff<=7){

action="urgent"

}

else if(stock<=20){

action="restock"

}

else if(diff<=7){

action="discount"

}

return{diff,action}

}


app.get("/api/items",async(req,res)=>{

const items=await Item.find().sort({ExpiryDate:1})

res.json(items)

})


app.post("/api/items",async(req,res)=>{

const{ItemName,Category,StockQty,ExpiryDate}=req.body

const{diff,action}=calculateStatus(ExpiryDate,StockQty)

const item=new Item({

ItemName,

Category,

StockQty,

ExpiryDate,

DaysUntilExpiry:diff,

SuggestedAction:action

})

await item.save()

res.json(item)

})


app.put("/api/items/:id",async(req,res)=>{

const{ItemName,Category,StockQty,ExpiryDate}=req.body

const{diff,action}=calculateStatus(ExpiryDate,StockQty)

const item=await Item.findByIdAndUpdate(

req.params.id,

{

ItemName,

Category,

StockQty,

ExpiryDate,

DaysUntilExpiry:diff,

SuggestedAction:action

},

{new:true}

)

res.json(item)

})


app.delete("/api/items/:id",async(req,res)=>{

await Item.findByIdAndDelete(req.params.id)

res.json({message:"deleted"})

})


const PORT=5000

app.listen(PORT,()=>{

console.log("Server running on port "+PORT)

})