const auth = firebase.auth();
const DB = firebase.firestore();

const app = Sammy('#root', function(){

    this.use('Handlebars','hbs');

    this.get('#/home', function(context){
        DB.collection("offers")
            .get()
            .then((res)=>{
                context.offers = res.docs.map((offer)=> {return {id: offer.id, ...offer.data()}})

                loadPartial(context)
                .then(function(){
                this.partial('./templates/home.hbs')
                });
            })
       
    })

    this.get('#/register', function(context){
        
        loadPartial(context)
            .then(function(){
            this.partial('./templates/register.hbs')
            });
    })
    
    this.get('#/login', function(context){
        
        loadPartial(context)
            .then(function(){
            this.partial('./templates/login.hbs')
            });
    })

    this.post('#/register',function(context){
        
        let { email, password, rePassword } = context.params;
       
        if(email ==""){
            this.redirect('#/register');
            return;
        }
        if(password!==rePassword||password.length<6){
            this.redirect('#/register');
            return;
        }

        auth.createUserWithEmailAndPassword(email, password)
            .then(res=>{
                console.log(res);
                this.redirect('#/home');
            })
            .catch(e=>{
                this.redirect('#/register');
                console.log(e.message);
            })
    })

    this.post('#/login',function(context){

        let { email, password } = context.params;
        auth.signInWithEmailAndPassword(email, password)
            .then(res=>{
                saveUserInfo(res);
                this.redirect('#/home')
            })
            .catch(e=>{
                this.redirect('#/login');
                console.log(e.message)})
    })

    this.get('#/create-offer', function(context){
        
        loadPartial(context)
            .then(function(){
            this.partial('./templates/createOffer.hbs')
            });
    })

    this.post('#/create-offer',function(context){
        let { name, price, imageUrl, description, brand} = context.params;
        debugger
        let user = getUserInfo();
        
        DB.collection('offers').add({
            name,
            price,
            imageUrl,
            description,
            brand,
            "creator": user.uid,
            clients: []
        })
        .then(res=>{
            console.log(res);
            this.redirect('#/home');
        })
        .catch(e=>{
            console.log(e.message);
        })
    })

    this.get('#/details/:id', function(context){
       
        //console.log(context.params.id);
        DB.collection('offers')
            .doc(context.params.id)
            .get()
            .then(res=>{
                const data = res.data();
                const user = getUserInfo('user')
                
                debugger
                const isBought = data.clients.some(x=>x==user.email);
                const isCreator = data.creator===user.uid;
                context.offer = {...data, isCreator, id:res.id, isBought}

                loadPartial(context)
                .then(function(){
                this.partial('./templates/details.hbs')
                });
            })
        
    })

    this.get('#/edit/:id', function(context){
        let id = context.params.id;
       
        DB.collection('offers').doc(id).get()
            .then(res=>{
                context.offer = {id, ...res.data()};

                loadPartial(context)
                .then(function(){
                    this.partial('./templates/editOffer.hbs')
                });
            })
        
    })

    this.post('#/edit/:id', function(context){
        let { id, name, price, description, imageUrl, brand} = context.params;
        
        const updateData = {
            name,
            price,
            description,
            imageUrl,
            brand
        };

        DB.collection('offers').doc(id).update(updateData)
            .then(res=>{
                this.redirect(`#/details/${id}`)
            })
            .catch(e=>console.log(e.message));
        debugger
    })

    this.get('#/logout',function(context){
        auth.signOut()
            .then(res=>{
                localStorage.removeItem('user');
                this.redirect('#/home');
            })
            .catch(e=>{
                console.log(e.message);
            })
    })

    this.get('#/delete/:id', function(context){
        const id = context.params.id;

        DB.collection('offers').doc(id).delete()
            .then(res=>{
                this.redirect('#/home');
            })
            .catch(e=>console.log(e.message))
    })

    this.get('#/buy/:id',function(context){
        console.log(context.params);
        const id = context.params.id;
        const user = getUserInfo();

        DB.collection('offers').doc(id).update({
            clients: firebase.firestore.FieldValue.arrayUnion(user.email)
        }).then(res=>{
            this.redirect(`#/details/${id}`)
        })
    })

});

app.run('#/home');

function loadPartial(context){
    let user = getUserInfo();
        if(user){
            context.isLoggedIn = true;
            context.email = user.email;
        }
    return context.loadPartials({
        'header': './partials/header.hbs',
        'footer': './partials/footer.hbs'
    })
}

function saveUserInfo(data){
    let { email , uid } = data.user;
    localStorage.setItem('user',JSON.stringify({email,uid}));
}

function getUserInfo(){

    const user =  localStorage.getItem('user');
    return user? JSON.parse(user) : null;
}