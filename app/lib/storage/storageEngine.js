import { prettyDate } from "../serverUtils.js";
import { getUserId } from "../authentication/firebase.js";

const clientsToUpdate = {};
const lastEditedCache = {};

export function updateLastEdited(req, date = Date.now()) {
  const userid = getUserId(req);
  lastEditedCache[userid] = date;
  console.log({ lastEditedCache });
  return date;
}

export function getLastEdited(userid) {
  return lastEditedCache[userid];
}

// This wrapper,
// 1. Executes the save function.
// 2. Catches and handles any errors.
// 3. Edits the created at timestamp to send back to the client and in the last edited cache on the server. And
// 4. Updates other clients if updateData is given.
export async function save(req, res, updateData, saveFunc) {
  const clientidOfWriter = req.body.clientSessionId;
  console.log({ clientidOfWriter }, "in save");
  const userid = getUserId(req);
  const lastHeardFromServer = Date.now();
  if (updateData) {
    const data = { ...updateData.data };
    data.lastHeardFromServer = lastHeardFromServer;
    updateClients(userid, clientidOfWriter, updateData.eventName, data);
  } else {
    console.warn("No update data given for", saveFunc);
  }
  const result = await saveFunc();
  if (result.success) {
    updateLastEdited(req, lastHeardFromServer);
    result.data.lastHeardFromServer = lastHeardFromServer;
    res.cookie("lastHeardFromServer", lastHeardFromServer);
    res.status(200).json(result.data);
  } else {
    res.status(400).send(result.message).end();
  }
}

export function updateClients(userid, clientidOfWriter, eventName, _data) {
  console.log({ clientsToUpdate });
  if (!clientidOfWriter) {
    console.warn("No clientidOfWriter given for", eventName);
  }
  if (clientsToUpdate[userid] && clientsToUpdate[userid].length > 1) {
    console.log(
      `${clientsToUpdate[userid].length} clients to update for user ${userid}`
    );
    const data = { ..._data };
    console.log("event from id", clientidOfWriter);
    clientsToUpdate[userid].forEach((connection) => {
      if (connection.clientid !== clientidOfWriter) {
        console.log(
          `sending ${eventName} update to client`,
          connection.clientid
        );
        data.clientid = connection.clientid;

        connection.res.write(`event: ${eventName}\n`);
        connection.res.write(`data: ${JSON.stringify(data)}`);
        connection.res.write("\n\n");
        connection.res.flush();
      } else {
        console.log("not sending update to client", connection.clientid);
      }
    });
  } else {
  }
}

export function connectClient(userid, clientid, req, res) {
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  // flush the headers to establish SSE with client
  // needs to be done if using compression
  res.flushHeaders();
  const newConnection = { clientid, res };
  console.log("New connection", { userid, clientid });
  if (clientsToUpdate[userid]) {
    clientsToUpdate[userid].push(newConnection);
  } else {
    clientsToUpdate[userid] = [newConnection];
  }

  res.on("close", function () {
    disconnectClient(userid, clientid);
  });

  res.on("end", function () {
    disconnectClient(userid, clientid);
  });
}

function disconnectClient(userid, clientid) {
  console.log("Disconnecting client", { userid, clientid });
  if (clientsToUpdate[userid]) {
    clientsToUpdate[userid] = clientsToUpdate[userid].filter(
      (c) => c.clientid !== clientid
    );
  }
}
