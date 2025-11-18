// ==UserScript==
// @name         briefe.io
// @namespace    Violentmonkey Scripts
// @match        https://www.briefe.io/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @version      2.0
// @author       frank@vlatten.dev
// @require      https://ajax.googleapis.com/ajax/libs/jquery/1.8.2/jquery.min.js
// @require      https://cdn.jsdelivr.net/npm/pouchdb@8.0.1/dist/pouchdb.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/crypto-js/3.1.9-1/core.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/crypto-js/3.1.9-1/md5.js
// @updateURL    https://github.com/casparjones/briefeio-monkey/raw/main/briefe.io.user.js
// @downloadURL  https://github.com/casparjones/briefeio-monkey/raw/main/briefe.io.user.js
// @description  briefe.io script for adding contacts and sync to a couchDB instance
// ==/UserScript==

// --- Minimal jQuery compatible native wrapper packaged as getDollar() ---
function getDollar() {

    class DollarWrapper {
        constructor(elements) {
            this.elements = Array.from(elements || []);
            this.length = this.elements.length;

            // direct index access like jQuery $(x)[0]
            for (let i = 0; i < this.length; i++) {
                this[i] = this.elements[i];
            }
        }

        html(content) {
            if (content === undefined) {
                return this.length ? this.elements[0].innerHTML : undefined;
            }

            this.elements.forEach(el => {
                if (content instanceof DollarWrapper) {
                    // Clear old content
                    el.innerHTML = "";
                    content.elements.forEach(child => el.appendChild(child.cloneNode(true)));
                } else if (content instanceof Element) {
                    el.innerHTML = "";
                    el.appendChild(content.cloneNode(true));
                } else {
                    // String fallback
                    el.innerHTML = content;
                }
            });

            return this;
        }

        val(value) {
            if (value === undefined) {
                return this.length ? this.elements[0].value : undefined;
            }
            this.elements.forEach(el => el.value = value);
            return this;
        }

        append(item) {
            this.elements.forEach(el => {
                if (typeof item === "string") {
                    el.insertAdjacentHTML("beforeend", item);
                } else if (item instanceof DollarWrapper) {
                    item.elements.forEach(child => el.appendChild(child));
                } else {
                    el.appendChild(item);
                }
            });
            return this;
        }

        attr(name, value) {
            if (value === undefined) {
                return this.length ? this.elements[0].getAttribute(name) : undefined;
            }
            this.elements.forEach(el => el.setAttribute(name, value));
            return this;
        }

        on(event, fn) {
            this.elements.forEach(el => el.addEventListener(event, fn));
            return this;
        }

        click(fn) {
            return this.on("click", fn);
        }

        remove() {
            this.elements.forEach(el => el.remove());
            return this;
        }
    }

    function dollar(selector) {

        // HTML → Create Element
        if (typeof selector === "string" && selector.trim().startsWith("<")) {
            const t = document.createElement("template");
            t.innerHTML = selector.trim();
            return new DollarWrapper([t.content.firstChild]);
        }

        // String selector → NodeList
        if (typeof selector === "string") {
            return new DollarWrapper(document.querySelectorAll(selector));
        }

        // Element passed
        if (selector instanceof Element) {
            return new DollarWrapper([selector]);
        }

        // NodeList, Array, etc.
        return new DollarWrapper(selector);
    }

    dollar.createDeferred = function() {
      let resolveFn, rejectFn;

      const promise = new Promise((res, rej) => {
          resolveFn = res;
          rejectFn = rej;
      });

      return {
          promise,
          resolve: resolveFn,
          reject: rejectFn,
          then: (...args) => promise.then(...args),
          done: (fn) => { promise.then(fn); return this; },
          fail: (fn) => { promise.catch(fn); return this; }
      };
    }

    return dollar;
}

function getBriefIo() {
  var brief = {};
  brief.revisons = {};
  brief.type = 'sender';
  brief.contacts = [];
  brief.bodies = [];
  const $ = getDollar();

  brief.addButtons = function() {
    $($('.im-delight-letters-page-sender .next')[0]).append('<li class="next"><a style="margin-right: 5px; cursor: pointer;" id="save">save</a><li>');
    $($('.im-delight-letters-page-sender .next')[0]).append('<li class="next"><a style="margin-right: 5px; cursor: pointer;" id="delete">delete</a><li>');
    $($('.im-delight-letters-page-recipient .next')[0]).append('<li class="next"><a style="margin-right: 5px; cursor: pointer;" id="save_recipient">save</a><li>');
    $($('.im-delight-letters-page-recipient .next')[0]).append('<li class="next"><a style="margin-right: 5px; cursor: pointer;" id="delete_recipient">delete</a><li>');
    $($('.im-delight-letters-page-body .next')[0]).append('<li class="next"><a style="margin-right: 5px; cursor: pointer;" id="save_body">save</a><li>');
    $($('.im-delight-letters-page-body .next')[0]).append('<li class="next"><a style="margin-right: 5px; cursor: pointer;" id="delete_body">delete</a><li>');
  }

  brief.addList = function() {
    $($('.im-delight-letters-page-sender .next')[0]).append('<li class="next"><span style="margin-right: 5px; padding: 5px;" id="contact_list"></span><li>');
    $($('.im-delight-letters-page-recipient .next')[0]).append('<li class="next"><span style="margin-right: 5px; padding: 5px;" id="contact_list_receiver"></span><li>');
    $($('.im-delight-letters-page-body .next')[0]).append('<li class="next"><span style="margin-right: 5px; padding: 5px;" id="body_list"></span><li>');
  }

  brief.addEvents = function() {
    $('#save').click(() => { brief.type="sender"; brief.saveContact();});
    $('#delete').click(() => { brief.type="sender"; brief.deleteContact();});
    $('#save_recipient').click(() => { brief.type="recipient"; brief.saveContact();});
    $('#delete_recipient').click(() => { brief.type="recipient"; brief.deleteContact();});
    $('#save_body').click(() => { brief.type="body"; brief.saveBody();});
    $('#delete_body').click(() => { brief.type="body"; brief.deleteBody();});
  }

  brief.newContact = function(data) {
    if(typeof data == "undefined") data = {};
    let contact = { data: {}, elements: {} };
    contact.elements = {
      'name': 'input[name="letter[' + brief.type + '][name]"]',
      'street': 'input[name="letter[' + brief.type + '][street]"]',
      'postalCode': 'input[name="letter[' + brief.type + '][postalCode]"]',
      'city': 'input[name="letter[' + brief.type + '][city]"]',
      'country': 'input[name="letter[' + brief.type + '][country]"]',
      'contact.mobile': 'input[name="letter[' + brief.type + '][contact][mobile]"]',
      'contact.email': 'input[name="letter[' + brief.type + '][contact][email]"]',
      'financial.institute': 'input[name="letter[' + brief.type + '][financial][institute]"]',
      'financial.iban': 'input[name="letter[' + brief.type + '][financial][iban]"]',
      'financial.bic': 'input[name="letter[' + brief.type + '][financial][bic]"]',
      'references.customerNumber': 'input[name="letter[' + brief.type + '][references][customerNumber]'
    };

    contact.parseHtml = function() {
      var contact = this;
      Object.keys(contact.elements).forEach(function(name) {
        let key = contact.elements[name];
        if($(key).length > 0) {
          if($(key).attr('type') == "text") {
            contact.data[name] = $(key).val();
          } else {
            contact.data[name] = $(key).val();
          }
        }
      });
      contact.data._id = CryptoJS.MD5(contact.getContact()).toString();
      if(typeof brief.revisons[contact.data._id] !== "undefined") {
        contact.data._rev = brief.revisons[contact.data._id];
      }
    }

    contact.updateHtml = function() {
      var contact = this;
      Object.keys(contact.elements).forEach(function(name) {
        let key = contact.elements[name];
        if($(key).length > 0) {
          if($(key).attr('type') == "text") {
            $(key).val(contact.data[name]);
          } else {
            $(key).val(contact.data[name]);
          }
        }
      });
    }

    contact.remove = function() {
      let rev = brief.revisons[this.data._id];
      brief.db.remove(this.data._id, rev).then(() => {
        delete brief.revisons[this.data._id];
      });

    }

    contact.getContact = function() {
      return this.data.name;
    }

    contact.getName = function() {
      return this.data.name;
    }

    contact.data = data;
    contact.data.type = "contact";
    return contact;
  }

  /* end contact */

  /* start body */

  brief.newBody = function(data) {
    if(typeof data == "undefined") data = {};
    let body = { data: {}, elements: {} };
    body.elements = {
      'subject': 'textarea[name="letter[body][subject]"]',
      'message': 'textarea[name="letter[body][message]"]',
    };

    body.parseHtml = function() {
      var body = this;
      Object.keys(body.elements).forEach(function(name) {
        let key = body.elements[name];
        if($(key).length > 0) {
          body.data[name] = $(key).val();
        }
      });
      body.data._id = CryptoJS.MD5(body.getSubject()).toString();
      if(typeof brief.revisons[body.data._id] !== "undefined") {
        body.data._rev = brief.revisons[body.data._id];
      }
    }

    body.updateHtml = function() {
      var body = this;
      Object.keys(body.elements).forEach(function(name) {
        let key = body.elements[name];
        if($(key).length > 0) {
          if($(key).attr('name') == "letter[body][subject]") {
            $(key).val(body.data.subject);
          } else {
            $(key).val(body.data.message);
          }
        }
      });
    }

    body.remove = function() {
      let rev = brief.revisons[this.data._id];
      brief.db.remove(this.data._id, rev).then(() => {
        delete brief.revisons[this.data._id];
      });

    }

    body.getSubject = function() {
      return this.data.subject;
    }

    body.getMessage = function() {
      return this.data.message;
    }

    body.data = data;
    body.data.type = "body";
    return body;
  }

  /* end body */

  brief.saveContact = function() {
    var contact = brief.newContact()
    contact.parseHtml();
    brief.db.put(contact.data, function callback(err, result) {
      if (!err) {
        brief.revisons[result.id] = result.rev;
        console.log('Successfully saved a contact!');
        brief.updateList().then(() => {
          brief.selectListId(contact.data._id);
        });
      } else {
        console.error(err);
      }
    });
  }

  brief.saveBody = async function() {
      const body = brief.newBody();
      body.parseHtml();

      try {
          // Prüfen ob Dokument existiert
          const existing = await brief.db.get(body.data._id);

          // vorhandene _rev übernehmen
          body.data._rev = existing._rev;

          // Update schreiben
          const result = await brief.db.put(body.data);

          brief.revisons[result.id] = result.rev;
          console.log("Updated body!");
          await brief.updateBodyList();
          brief.selectBodyListId(body.data._id);

      } catch (err) {
          if (err.status === 404) {
              // Dokument existiert noch nicht → Neu anlegen
              const result = await brief.db.put(body.data);

              brief.revisons[result.id] = result.rev;
              console.log("Created new body!");
              await brief.updateBodyList();
              brief.selectBodyListId(body.data._id);

          } else {
              console.error(err);
          }
      }
  }

  brief.loadData = function() {
    var def = $.createDeferred();
    // brief.db.allDocs({include_docs: true, descending: true}, (err, doc) => {
    brief.db.allDocs({include_docs: true, descending: true}, (err, doc) => {
      if(err) {
        def.reject(err);
      } else {
        brief.contacts = [];
        brief.bodies = [];
        doc.rows.forEach(function(row) {
          brief.revisons[row.doc._id] = row.doc._rev;
          if(typeof row.doc.subject !== "undefined") {
            brief.bodies.push(brief.newBody(row.doc));
          } else if(typeof row.doc.name !== "undefined") {
            brief.contacts.push(brief.newContact(row.doc));
          }
        });
        def.resolve();
      }
    });

    return def;
  }

   brief.loadBodies = function() {
    var def = $.createDeferred();
    brief.loadData().then(() => {
      def.resolve(brief.bodies);
    });
    return def;
  }

  brief.loadContacts = function() {
    var def = $.createDeferred();
    brief.loadData().then(() => {
      def.resolve(brief.contacts);
    });
    return def;
  }

  brief.getContact = function(id) {
    var def = $.createDeferred();
    brief.db.get(id).then(function(doc) {
      def.resolve(brief.newContact(doc));
    })

    return def;
  }

  brief.getBody = function(id) {
    var def = $.createDeferred();
    brief.db.get(id).then(function(doc) {
      def.resolve(brief.newBody(doc));
    })

    return def;
  }

  brief.changeContact = function(option) {
    brief.type = "sender";
    let id = $(option.target).val();
    brief.getContact(id).done(function(contact) {
      contact.updateHtml();
    })
  }


  brief.changeContactReceiver = function(option) {
    brief.type = "recipient";
    let id = $(option.target).val();
    brief.getContact(id).done(function(contact) {
      contact.updateHtml();
    })
  }

  brief.changeBody = function(option) {
    brief.type = "body";
    let id = $(option.target).val();
    brief.getBody(id).done(function(body) {
      body.updateHtml();
    })
  }

  brief.updateBodyList = function() {
    var def = $.createDeferred();
    brief.loadBodies().done((bodies) => {
      var select_body = $('<select id="body_selection" style="border: 0; box-shadow: none; max-width: 640px" class="form-control im-delight-letters-autosave">');
      var option_body = $('<option value="0">choose Body</option>');
      select_body.append(option_body);

      bodies.forEach(function(body) {
        option_body = $('<option value="' + body.data._id + '">' + body.getSubject() + '</option>');
        select_body.append(option_body);
      });

      $('#body_list').html(select_body);
      $('#body_list select').on('change', brief.changeBody);


      def.resolve();
    });
    return def;
  }

  brief.updateList = function() {
    var def = $.createDeferred();
    brief.loadContacts().done(function(contacts) {

      // <-- sort alphabetically by name (case-insensitive)
      contacts.sort(function(a, b) {
        const nameA = (a.getName() || "").toLowerCase();
        const nameB = (b.getName() || "").toLowerCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
      });

      var select = $('<select id="contact_selection" style="border: 0; box-shadow: none;" class="form-control im-delight-letters-autosave">');
      var select_receiver = $('<select id="contact_selection_receiver" style="border: 0; box-shadow: none;" class="form-control im-delight-letters-autosave">');
      var option_sender = $('<option value="0">choose Contact</option>');
      var option_reciver = $('<option value="0">choose Contact</option>');
      select.append(option_sender);
      select_receiver.append(option_reciver);

      contacts.forEach(function(contact) {
          let option_sender = $('<option value="' + contact.data._id + '">' + contact.getName() + '</option>');
          let option_reciver = $('<option value="' + contact.data._id + '">' + contact.getName() + '</option>');

          select.append(option_sender[0]);          // <– wichtig
          select_receiver.append(option_reciver[0]); // <– wichtig
      });


      $('#contact_list').html(select);
      $('#contact_list select').on('change', brief.changeContact);

      $('#contact_list_receiver').html(select_receiver);
      $('#contact_list_receiver select').on('change', brief.changeContactReceiver);
      def.resolve();
    });

    return def;
  }

  brief.selectListId = function(id) {
    $('#contact_list select').val(id);
    $('#contact_list_receiver select').val(id);
  }

  brief.selectBodyListId = function(id) {
    $('#body_list select').val(id);
  }

  brief.deleteContact = function(option) {
    let id = $('#contact_selection').val();
    brief.getContact(id).done(function(contact) {
      contact.remove();
      brief.updateList();
    })
  }

  brief.deleteBody = function(option) {
    let id = $('#body_list select').val();
    brief.getBody(id).done(function(body) {
      body.remove();
      brief.updateBodyList();
    })
  }

  brief.delete = function() {
    let id = $(option.target).val();
  }

  brief.config = function() {
    brief.remoteUrl = GM_getValue("remoteUrl")

     GM_registerMenuCommand("set Em Space to clipboard for more then on linebreak", async () => {
        navigator.clipboard.writeText(' ');
        console.log('Em Space copied to clipboard');
        alert("Em Space copied to clipboard");
    });



    GM_registerMenuCommand("set couchDB remote URL", () => {
      let remoteUrl = GM_getValue("remoteUrl")
      $('body').append(`
        <div id="brief_io_modal" style="background-color: white;position: fixed;width: 800px;top: 100px;left: calc(50% - 400px);height: 400px;padding:  15px;border: 1px solid black;border-radius: 15px;">
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/purecss@3.0.0/build/pure-min.css" integrity="sha384-X38yfunGUhNzHpBaEBsWLO+A0HDYOQi8ufWDkZ0k9e0eXz/tH3II7uKZ9msv++Ls" crossorigin="anonymous">
          <h3>briefe.io config</h3>
          <form class="pure-form pure-form-stacked">
              <fieldset>
                  <legend>Hier bitte den URL String zu deiner CouchDB eintragen. <br/>z.B. <code>https://{user}:{password}@{domain}/{database}</code></legend>
                  <input id="briefIoValue" type="text" placeholder="https://..." value="${remoteUrl}" class="pure-input-1"/><br/>
                  <button id="briefIoSaveButton" class="pure-button pure-button-primary">save</button>
              </fieldset>
          </form>
        </div>
      `);

      $('#briefIoSaveButton').on("click", (e) => {
        let remoteUrl = $('#briefIoValue').val();
        GM_setValue('remoteUrl', remoteUrl);
        $('#brief_io_modal').remove();
        brief.remoteUrl = GM_getValue("remoteUrl")
      });

    });
  }

  // brief.helper = getHelper();
  brief.init = function() {
    brief.db = new PouchDB('briefIo');
    if(brief.remoteUrl) {
      PouchDB.sync('briefIo', brief.remoteUrl);
    }
    brief.addButtons();
    brief.addList();
    brief.updateList();
    brief.updateBodyList();
    brief.addEvents();
  }
  return brief;
}

(function() {
  'use strict';
  var brief = getBriefIo();
  brief.config();
  brief.init();
})();
