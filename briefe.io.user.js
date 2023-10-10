// ==UserScript==
// @name        briefe.io
// @namespace   Violentmonkey Scripts
// @match       https://www.briefe.io/*
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_addStyle
// @grant       GM_registerMenuCommand
// @version     1.5
// @author      frank@lovely-apps.com
// @require     https://ajax.googleapis.com/ajax/libs/jquery/1.8.2/jquery.min.js
// @require     https://cdn.jsdelivr.net/npm/pouchdb@8.0.1/dist/pouchdb.min.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/crypto-js/3.1.9-1/core.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/crypto-js/3.1.9-1/md5.js
// @updateURL   https://github.com/casparjones/briefeio-monkey/raw/main/briefe.io.user.js
// @description briefe.io script for adding contacts and sync to a couchDB instance
// ==/UserScript==

function getBriefIo() {
  var brief = {};
  brief.revisons = {};
  brief.type = 'sender';
  brief.contacts = [];
  brief.bodies = [];

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
      brief.db.remove(this.data._id, rev).then((result) => {
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
      brief.db.remove(this.data._id, rev).then((result) => {
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

  brief.saveBody = function() {
    var body = brief.newBody()
    body.parseHtml();
    brief.db.put(body.data, function callback(err, result) {
      if (!err) {
        brief.revisons[result.id] = result.rev;
        console.log('Successfully saved a body!');
        brief.updateBodyList().then(() => {
          brief.selectBodyListId(body.data._id);
        });
      } else {
        console.error(err);
      }
    });
  }

  brief.loadData = function() {
    var def = jQuery.Deferred();
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
          } else {
            brief.contacts.push(brief.newContact(row.doc));
          }
        });
        def.resolve();
      }
    });

    return def;
  }

   brief.loadBodies = function() {
    var def = jQuery.Deferred();
    brief.loadData().then(() => {
      def.resolve(brief.bodies);
    });
    return def;
  }

  brief.loadContacts = function() {
    var def = jQuery.Deferred();
    brief.loadData().then(() => {
      def.resolve(brief.contacts);
    });
    return def;
  }

  brief.getContact = function(id) {
    var def = jQuery.Deferred();
    brief.db.get(id).then(function(doc) {
      def.resolve(brief.newContact(doc));
    })

    return def;
  }

  brief.getBody = function(id) {
    var def = jQuery.Deferred();
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
    var def = jQuery.Deferred();
    brief.loadBodies().done((bodies) => {
      var select_body = $('<select id="body_selection" style="border: 0; box-shadow: none;" class="form-control im-delight-letters-autosave">');
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
    var def = jQuery.Deferred();
    brief.loadContacts().done(function(contacts) {
      var select = $('<select id="contact_selection" style="border: 0; box-shadow: none;" class="form-control im-delight-letters-autosave">');
      var select_receiver = $('<select id="contact_selection_receiver" style="border: 0; box-shadow: none;" class="form-control im-delight-letters-autosave">');
      var option_sender = $('<option value="0">choose Contact</option>');
      var option_reciver = $('<option value="0">choose Contact</option>');
      select.append(option_sender);
      select_receiver.append(option_reciver);

      contacts.forEach(function(contact) {
        option_sender = $('<option value="' + contact.data._id + '">' + contact.getName() + '</option>');
        option_reciver = $('<option value="' + contact.data._id + '">' + contact.getName() + '</option>');
        select.append(option_sender);
        select_receiver.append(option_reciver);
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
