# briefe.io – Violentmonkey Enhancement Script

This userscript enhances the functionality of **briefe.io** by adding powerful features such as:

- Contact management (create, edit, delete)
- Body/message templates (create, edit, delete)
- Local storage in **PouchDB**
- Optional **synchronization with CouchDB**
- Automatic field extraction from the briefe.io UI
- Dropdown lists for quickly selecting saved contacts and message bodies
- Additional UI buttons inside briefe.io
- Fully jQuery-free implementation (custom Tiny-$ wrapper)
- Compatible with Violentmonkey, Tampermonkey, and Greasemonkey

This project aims to make repetitive letter writing significantly faster and more convenient.


---

## ✨ Features

### ✔ Save & Load Contacts
Contacts are extracted from the sender/recipient form fields and saved automatically with a generated `_id`.  
Stored contacts can be selected directly from a dropdown list.

### ✔ Save & Load Bodies (Letter Templates)
Bodies consist of:
- Subject  
- Message  

They can be saved as reusable templates and inserted via a dropdown.

### ✔ Local Database (PouchDB)
The script uses **PouchDB** to store everything in your browser:

- Contacts  
- Bodies  
- Revisions  

The data persists across browser sessions.

### ✔ CouchDB Sync (optional)
You can set a CouchDB URL in the script’s menu:

```

Violentmonkey → briefe.io script → “Set couchDB remote URL”

```

This enables two-way sync:
- Offline use  
- Multi-device support  
- Backup in your own CouchDB  

### ✔ Custom `$` Wrapper (no jQuery required)
A minimal jQuery-like wrapper is included:
- `$(selector)`
- `.on()`, `.click()`
- `.val()`, `.html()`, `.append()`
- `.attr()`, `.remove()`

This keeps the script small, fast, and dependency-free.

---

## 🛠 Installation

### 1. Install a Userscript Manager
You need **one** of these browser extensions:

- **Violentmonkey** (recommended)
- Tampermonkey
- Greasemonkey

Here are the links:

| Browser | Extension |
|--------|-----------|
| Chrome / Edge | https://violentmonkey.github.io |
| Firefox | https://addons.mozilla.org/en-US/firefox/addon/violentmonkey/ |
| Opera | https://violentmonkey.github.io |

---

### 2. Install the Script

Click this link:

👉 **https://github.com/casparjones/briefeio-monkey/raw/main/briefe.io.user.js**

Your userscript manager will ask you to **install** it.

---

### 3. Open briefe.io
Go to:
[https://www.briefe.io/](https://www.briefe.io/)

The script activates automatically.
You will see new buttons inside the interface:
- Save / Delete sender  
- Save / Delete recipient  
- Save / Delete body  
- Dropdown lists for selecting contacts and bodies  

---

## ⚙️ Optional: Configure CouchDB Sync

Open your Userscript manager’s menu:

```
→ Violentmonkey menu
→ briefe.io
→ Set couchDB remote URL
```

Enter your CouchDB connection string, for example:

```
https://username:password@your-domain.com/briefio
````
Once saved, the script syncs automatically in the background using:

```js
PouchDB.sync('briefIo', remoteUrl);
````

---

## 📦 Dependencies (Bundled)

The script includes:

* PouchDB 8.x
* CryptoJS (MD5)
* Custom `$` wrapper (jQuery alternative)
* Minimal Deferred implementation

You don't need any external jQuery.

---

## 🧩 Project Structure

```
briefeio-monkey/
│
├── briefe.io.user.js      # Main userscript
├── README.md              # This file
└── (optional future assets)
```

---

## 🧪 Development Notes

* The script injects UI elements directly into briefe.io.
* DOM parsing uses a custom `$` wrapper for performance.
* Contacts and bodies are differentiated by structure and stored in PouchDB.
* All revisions are tracked to avoid CouchDB conflicts.

If you want to modify the script:

* Clone the repo
* Edit `briefe.io.user.js`
* Reload it in Violentmonkey

---

## 🤝 Contributing

Pull requests and improvements are welcome!
I would appreciate some suggestions for new features (address book export, encryption, better UI integration).

---

## 📜 License

**GNU General Public License v3.0**

This project is licensed under the GPL-3.0.  
You are free to use, modify, and distribute the software, provided that:

- any derivative work is also distributed under the GPL-3.0  
- the copyright notices remain intact  
- the source code remains available under the same license  

The software is provided "as-is", without any warranty.

---

## ❤️ Credits

Created by **Frank Vlatten**
Maintained and enhanced with the help of ChatGPT.
