const login_btn = document.getElementById('login')
const login_msg = document.getElementById('login-msg')
const content = document.getElementById('content')

// const getstuff = document.getElementById('playlists')

document.addEventListener("DOMContentLoaded", async () => {
    
    const userid = localStorage.getItem('user_id')
    const resp = await fetch(`/userauthenticated/${userid}`)
    const authenticated = await resp.json()
    
    if (authenticated == true) {
        console.log("Already authenticated, resuming session: ")
        logged_in()
    }

})

login_btn.addEventListener('click', async () => {
    
    const user_id = gen_userid()
    localStorage.setItem("user_id", user_id)
    
    // window.location.href = `http://localhost:3000/login/${user_id}`
    window.open(`http://localhost:3000/login/${user_id}`, '_blank')
    // window.open(`http://localhost:3000/login`, '_blank')

    const check_authenticated = setInterval(async () => {
        
        const userid = localStorage.getItem('user_id')
        const resp = await fetch(`/userauthenticated/${userid}`)
        const authenticated = await resp.json()

        if (authenticated == true) {
            clearInterval(check_authenticated)
            logged_in()
        }
    }, 1000);

})

function logged_in() {
    login_btn.textContent = "Logged in"
    login_msg.textContent = "Spotify account sucessfully connected!"

    displayplaylists()
}


async function displayplaylists() {

    const userid = localStorage.getItem("user_id")

    const resp = await fetch(`/getplaylists/${userid}`)
    const playlists = await resp.json()
    // console.log(playlists)

    content.innerHTML = '<div id="display" class="playlists-display"></div>'

    for (const playlist of playlists.items) {
        const dispplay = document.getElementById('display')

        const root = document.createElement('div')
        const text_root = document.createElement('div')
        const image = document.createElement('img')
        const name = document.createElement('a')
        const desc = document.createElement('p')
        const song_num = document.createElement('p')

        image.src = playlist.images["0"].url
        image.className = 'playlist-img'
        name.textContent = playlist.name
        name.href = playlist.external_urls.spotify
        name.target = '_blank'
        name.className = 'playlist-title'
        desc.textContent = playlist.description
        song_num.textContent = `Total Songs: ${playlist.tracks.total}`
        root.className = 'playlist-item'
        root.setAttribute('data-id', playlist.id)
        root.setAttribute('data-len', playlist.tracks.total)
        text_root.className = 'text-item'

        text_root.append(name, desc, song_num)
        root.append(image, text_root)
        
        display.append(root)
        // console.log(playlist)
    }
    
    const playlist_item = document.querySelectorAll('.playlist-item')
    
    playlist_item.forEach(item => {
        item.addEventListener('click', e => {
            const id = item.dataset.id
            const len = item.dataset.len
            // console.log(id)
            // console.log(len)
            displaysongs(id, len)
        })
    })
}

async function displaysongs(id, len) {

    const userid = localStorage.getItem("user_id")

    const display = document.getElementById('display')
    display.innerHTML = ''
    display.className = 'songs-display'
    
    const backbtn = document.createElement('button')
    backbtn.innerHTML = 'Back'
    backbtn.className = 'button'
    const firstChild = content.firstChild;
    content.insertBefore(backbtn, firstChild);
    backbtn.addEventListener('click', () => displayplaylists())

    
    let songlist = []
    let i = 0
    while (i < Math.ceil(len/100)) {

        const resp = await fetch(`/getsongs/${userid}?id=${id}&offset=${i*100}`)
        const songs = await resp.json()

        for (const song of songs.items) {
            try {
                songlist.push(song.track.name)

                const root = document.createElement('div')
                const text_root = document.createElement('div')
                const image = document.createElement('img')
                const name = document.createElement('a')
                const artist = document.createElement('p')
                // const song_num = document.createElement('p')

                image.src = song.track.album.images[0].url
                image.className = 'song-img'
                name.textContent = song.track.name
                name.className = 'song-title'
                // name.setAttribute('data-name', song.track.name)
                artist.textContent = song.track.album.artists[0].name
                // song_num.textContent = `Total Songs: ${playlist.tracks.total}`
                root.className = 'song-item'
                root.setAttribute('data-name', song.track.name)
                // root.setAttribute('data-id', song.track.id)
                text_root.className = 'songtext-item'

                text_root.append(name, artist)
                root.append(image, text_root)
                
                display.append(root)
                
                // console.log(song)
            } catch (error) {
                console.log(error)
            }
        }
        i++
    }

    findduplicates(songlist)

}

function findduplicates(songlist) {
    let seen = new Set()
    let duplicate_tracker = new Set()

    for (let song of songlist) {
        if (seen.has(song)) {
            duplicate_tracker.add(song)
        } else {
            seen.add(song)
        }
    }
    
    const duplicates = Array.from(duplicate_tracker)

    for (let song of duplicates) {
        const item = document.querySelectorAll(`[data-name="${song}"]`)
        // console.log(item)
        item.forEach(element => {
            element.classList.add('duplicate')
        })
    }

    const duplicates_list = document.createElement('div')

    if (duplicates.length == 0) {
        duplicates_list.textContent = 'No duplicates found, all good!'
        return
    } else if (duplicates.length == 1) {
        var msg = "<p>Duplicate found:"
    } else {
        var msg = "<p>Duplicates found:"
    }

    for (const duplicate of duplicates) {
        msg += `<br>${duplicate}`
    }
    msg += "</p>"

    duplicates_list.innerHTML = msg
    content.append(duplicates_list)

    const showduplicates = document.createElement('button')
    showduplicates.innerHTML = 'Show only duplicates'
    showduplicates.className = "button"
    content.append(showduplicates)

    showduplicates.addEventListener('click', () => showonlyduplicates())

    return
    // return Array.from(duplicates);
}

function showonlyduplicates() {

    const songs = document.getElementsByClassName('song-item')

    // Weird behaviour with iterating over an array while also removing items, fixed by creating copy like this
    const songcopy = Array.from(songs)

    for (const song of songcopy) {
        if (!song.classList.contains('duplicate')) {
            // console.log(song)
            song.remove()
        }
    }
}

function gen_userid() {
    const length = 16

    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

// getstuff.addEventListener('click', async () => {

//     const id = localStorage.getItem("user_id")
//     const rep = await fetch(`/getplaylists/${id}`)
//     // const resp = await fetch(`/userauthenticated/${id}`)

// })