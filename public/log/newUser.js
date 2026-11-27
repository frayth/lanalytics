const prenom = document.querySelector('#newName');
const nom = document.querySelector('#newFamily');
const email = document.querySelector('#mail');
const age = document.querySelector('#age');
const password = document.querySelector('#password');
const verifPassword = document.querySelector('#verifMdp');
const body=document.querySelector('body');
document.querySelector('#form').addEventListener('submit', e => {
    e.preventDefault();
        let p=document.querySelector('#error');
    p.hidden=true;

    if(prenom.style.outlineColor!='green'){
        p.textContent='Veuillez renseigner un prénom valide (pas de chiffres ou de ponctuation)'
        p.hidden=false;
        return
    }
    if(nom.style.outlineColor!='green'){
        p.textContent='Veuillez renseigner un nom valide (pas de chiffres ou de ponctuation)'
        p.hidden=false;
        return
    }
    if(nom.style.outlineColor!='green'){
        p.textContent='Veuillez renseigner un nom valide (pas de chiffres ou de ponctuation)'
        p.hidden=false;
        return
    }
    if(email.style.outlineColor!='green'){
        p.textContent='Veuillez renseigner un e-mail valide'
        p.hidden=false;
        return
    }
    if(age.style.outlineColor!='green'){
        p.textContent='Veuillez sélectionner une date de naissance'
        p.hidden=false;
        return
    }
    if(password.style.outlineColor!='green'){
        p.textContent='Veuillez saisir un mot de passe'
        p.hidden=false;
        return
    }
    if(verifPassword.style.outlineColor!='green'){
        p.textContent='Les mots de passe de sont pas identique'
        p.hidden=false;
        return
    }
    p.hidden=true;
    
    async function sendData(){
        function formatData(data,type){
            if(type=='text'){
                data=data.split('')
                data[0]=data[0].toUpperCase();
                return data.join('');
            }else{
                return data.toLowerCase();
            }
        }
        const data={prenom:formatData(prenom.value,'text'),nom:formatData(nom.value,'text'),email:formatData(email.value,'email'),date:age.value,password:password.value};
        const options = {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
          }
        let response=await fetch('/newUser',options)
        let json=await response.json();

        if(json.statut=='success'){
            p.hidden=false;
            p.textContent='Compte bien enregistré dans la base de donnée';
            p.style.color='green';
        }else{
            p.hidden=false;
            p.textContent=`${json.err}`;
            p.style.color='red';
        }
    }
    sendData();
})
prenom.addEventListener('change', e => {
    const element = e.target;
    if (element.value.match(/[\d!?,;.:/!§%*µ+=&#><]/g) != null) element.style.outlineColor = 'red';
    else if (element.value != '')element.style.outlineColor = 'green';
    else element.style.outlineColor = '';
})
nom.addEventListener('change', e => {
    const element = e.target;
    if (element.value.match(/[\d!?,;.:/!§%*µ+=&#><]/g) != null) element.style.outlineColor = 'red';
    else if (element.value != '')element.style.outlineColor = 'green';
    else element.style.outlineColor = '';
})
email.addEventListener('change', e => {
    const element = e.target;
    if(element.value.match(/[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/g)==null && element.value!='')element.style.outlineColor = 'red'
    else if (element.value != '')element.style.outlineColor = 'green';
    else element.style.outlineColor = '';
})
age.addEventListener('change', e => {
    const element = e.target;
    element.style.outlineColor='green';
})
password.addEventListener('change', e => {
    const element = e.target;
    if(element.value!='' && element.value.length>=8){
        verifPassword.disabled=false;
        verifPassword.style.outlineColor='red';
        element.style.outlineColor='green';
    }
    else {
        verifPassword.disabled=true;
        verifPassword.style.outlineColor='';
        element.style.outlineColor='';
    }
    verifPassword.value='';
})

verifPassword.addEventListener('change', e => {
    const element = e.target;
    if(password.value==element.value)element.style.outlineColor='green'
    else element.style.outlineColor='red'
})

