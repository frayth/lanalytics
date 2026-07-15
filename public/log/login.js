
document.querySelector('#submit').addEventListener('click', e => {

    if (document.querySelector('#loginMail').value == '' || document.querySelector('#loginMdp').value == '') {
        alert('veuillez compléter les champs de connexion');
        return;
    }

    // connexion a son compte 
    async function sendData() {
        const data = { id: document.querySelector('#loginMail').value, password: document.querySelector('#loginMdp').value }
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        }
        let response = await fetch('/login', options);
        let json = await response.json();
        user = json.userId;
        dataUser = json.data;
        
        if (json.statut == 'success') {
           await localStorage.setItem('userAnalytics',JSON.stringify(user)) ;
           await localStorage.setItem('dataAnalytics',JSON.stringify(dataUser));
            window.location.href = '../index.html'
        } else {
            if (document.querySelector('#loginFail')) document.querySelector('#loginFail').remove();
            let p = document.createElement('p');
            p.id = 'loginFail';
            p.style.color = 'red';
            p.textContent = `${json.err}`;
            document.querySelector('#pageContainer').insertBefore(p, document.querySelector('#new'));
        }

    }
    sendData();
})



