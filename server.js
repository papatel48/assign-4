/*********************************************************************************
*  WEB322 – Assignment 05
*  I declare that this assignment is my own work in accordance with Seneca  Academic Policy.  No part of this
*  assignment has been copied manually or electronically from any other source (including web sites) or 
*  distributed to other students.
* 
*  Name: Pranav Patel
*  Student ID: 119954212
*  Date: 18/11/2022
*
*  Online (Cyclic) Link: 
*
********************************************************************************/ 


const express = require('express');
const blogData = require("./blog-service");
const multer = require("multer");
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const exphbs = require("express-handlebars");
const path = require("path");
const stripJs = require('strip-js');

const app = express();
 
const HTTP_PORT = process.env.PORT || 8080;

cloudinary.config({
  cloud_name: 'dwslgxp7b',
  api_key: '474295251232519',
  api_secret: 'Of9poBBYwVWlYvfiWJBtgJX5nl8',
  secure: true
});

const upload = multer();

app.engine(".hbs", exphbs.engine({
    extname: ".hbs",
    helpers: {
        navLink: function(url, options){
            return '<li' + 
                ((url == app.locals.activeRoute) ? ' class="active" ' : '') + 
                '><a href="' + url + '">' + options.fn(this) + '</a></li>';
        },
        equal: function (lvalue, rvalue, options) {
            if (arguments.length < 3)
                throw new Error("Handlebars Helper equal needs 2 parameters");
            if (lvalue != rvalue) {
                return options.inverse(this);
            } else {
                return options.fn(this);
            }
        },
        safeHTML: function(context){
            return stripJs(context);
        },
        formatDate: function(dateObj){
            let year = dateObj.getFullYear();
            let month = (dateObj.getMonth() + 1).toString();
            let day = dateObj.getDate().toString();
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2,'0')}`;
        }
        
    }
}));

app.set('view engine', '.hbs');
app.use(express.urlencoded({extended: true}));
app.use(express.static('public'));

app.use(function(req,res,next){
    let route = req.path.substring(1);
    app.locals.activeRoute = (route == "/") ? "/" : "/" + route.replace(/\/(.*)/, "");
    app.locals.viewingCategory = req.query.category;
    next();
});

app.get('/', (req, res) => {
    res.redirect("/blog");
});

app.get('/about', (req, res) => {
    res.render("about");
});

app.get('/blog', async (req, res) => {

    let viewData = {};

    try{

        
        let posts = [];

       
        if(req.query.category){
            
            posts = await blogData.getPublishedPostsByCategory(req.query.category);
        }else{
           
            posts = await blogData.getPublishedPosts();
        }

        
        posts.sort((a,b) => new Date(b.postDate) - new Date(a.postDate));

        
        let post = posts[0]; 

      
        viewData.posts = posts;
        viewData.post = post;

    }catch(err){
        viewData.message = "no results";
    }

    try{
        
        let categories = await blogData.getCategories();

      
        viewData.categories = categories;
    }catch(err){
        viewData.categoriesMessage = "no results"
    }

    
    res.render("blog", {data: viewData})

});

app.get('/posts', (req, res) => {
    

    let queryPromise = null;

    if (req.query.category) {
        queryPromise = blogData.getPostsByCategory(req.query.category);
    } else if (req.query.minDate) {
        queryPromise = blogData.getPostsByMinDate(req.query.minDate);
    } else {
        queryPromise = blogData.getAllPosts()
    }

    queryPromise.then(data => {
        if(data.length > 0) {
            res.render('posts',{ posts: data });
            
        } else {
            res.render("posts", {message: "no results"});
        }
    }).catch(err => {
        res.render("posts", {message: "no results"});
    })

});


app.get("/posts/add", (req, res) => {
    blogData.getCategories().then((data) => {
        res.render("addPost",{categories: data});
    }).catch((err) => {
        res.render("addPost", {categories: []});
    });
});

app.post('/posts/add', (req, res) => {
    blogData.addPost(req.body).then((data) => {
       res.redirect("/posts");
    }).catch((err) => {
        console.log(err);
    });
});

app.get('/post/:id', (req,res)=>{
    blogData.getPostById(req.params.id).then(data=>{
        res.json(data);
    }).catch(err=>{
        res.json({message: err});
    });
});

app.get('/blog/:id', async (req, res) => {

  
    let viewData = {};

    try{

        
        let posts = [];

        
        if(req.query.category){
            
            posts = await blogData.getPublishedPostsByCategory(req.query.category);
        }else{
            
            posts = await blogData.getPublishedPosts();
        }

        
        posts.sort((a,b) => new Date(b.postDate) - new Date(a.postDate));

       
        viewData.posts = posts;

    }catch(err){
        viewData.message = "no results";
    }

    try{
        
        viewData.post = await blogData.getPostById(req.params.id);
    }catch(err){
        viewData.message = "no results"; 
    }

    try{
        
        let categories = await blogData.getCategories();

        
        viewData.categories = categories;
    }catch(err){
        viewData.categoriesMessage = "no results"
    }

    
    res.render("blog", {data: viewData})
});

app.get('/categories', (req, res) => {
    blogData.getCategories().then((data => {
        if(data.length > 0) {
            res.render('categories',{ categories: data });
        } else {
            res.render("categories", {message: "no results"});
        }
    })).catch(err => {
        res.render("categories", {message: "no results"});
    });
});

app.get('/categories/add',function(req,res) {
    res.render('addCategory');
});

app.post('/categories/add', (req, res) =>  {

    blogData.addCategory(req.body).then((data) => {
        res.redirect("/categories");
    }).catch(err=>{
        res.status(500).send(err);
    })
});


app.get('/categories/delete/:id', function(req,res) {
    blogData.deleteCategoryById(req.params.id).then(() => {
        res.redirect("/categories");
    }).catch(() => {
        res.status(500).send("Unable to Remove Category / Category not found");
    });
});

app.get('/posts/delete/:id', function(req,res) {
    blogData.deletePostById(req.params.id).then(() => {
        res.redirect("/posts");
    }).catch(() => {
        res.status(500).send("Unable to Remove Post / Post not found");
    });
});



app.use((req, res) => {
    res.status(404).render("404");
})

blogData.initialize().then(() => {
    app.listen(HTTP_PORT, () => {
        console.log('server listening on: ' + HTTP_PORT);
    });
}).catch((err) => {
    console.log(err);
})
