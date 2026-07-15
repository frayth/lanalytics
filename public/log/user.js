
let user=localStorage.getItem('userAnalytics')==null?'':JSON.parse(localStorage.getItem('userAnalytics'));
let dataUser=localStorage.getItem('dataAnalytics')==null?'':JSON.parse(localStorage.getItem('dataAnalytics'));
let login= document.querySelector('#userConnect');

if (user==''){
  login.textContent='Connexion';

}else{
    login.textContent=`${user.name}`;
}
console.log(user)