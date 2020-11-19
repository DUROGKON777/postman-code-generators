var _ = require('../lodash'),
  sanitize = require('./sanitize').sanitize,
  path = require('path');

/**
 * Used to parse the body of the postman SDK-request and return in the desired format
 *
 * @param  {Object} request - postman SDK-request object
 * @param  {String} indentation - used for indenting snippet's structure
 * @param  {Boolean} bodyTrim - whether to trim request body fields
 * @returns {String} - request body
 */
module.exports = function (request, indentation, bodyTrim) {
  // used to check whether body is present in the request or not
  if (!_.isEmpty(request.body)) {
    var requestBody = '',
      bodyDataMap,
      enabledBodyList;

    switch (request.body.mode) {
      case 'raw':
        if (!_.isEmpty(request.body[request.body.mode])) {
          requestBody += `payload = ${sanitize(request.body[request.body.mode],
            request.body.mode, bodyTrim)}\n`;
        }
        else {
          requestBody = 'payload = \'\'\n';
        }
        return requestBody;
      case 'graphql':
        // eslint-disable-next-line no-case-declarations
        let query = request.body[request.body.mode].query,
          graphqlVariables;
        try {
          graphqlVariables = JSON.parse(request.body[request.body.mode].variables);
        }
        catch (e) {
          graphqlVariables = {};
        }
        requestBody += `payload = ${sanitize(JSON.stringify({
          query: query,
          variables: graphqlVariables
        }),
        'raw', bodyTrim)}\n`;
        return requestBody;
      case 'urlencoded':
        enabledBodyList = _.reject(request.body[request.body.mode], 'disabled');
        if (!_.isEmpty(enabledBodyList)) {
          bodyDataMap = _.map(enabledBodyList, function (value) {
            return `${sanitize(value.key, request.body.mode, bodyTrim)}=` +
                            `${sanitize(value.value, request.body.mode, bodyTrim)}`;
          });
          requestBody += `payload = '${bodyDataMap.join('&')}'\n`;
        }
        else {
          requestBody = 'payload = \'\'\n';
        }
        return requestBody;
      case 'formdata':
        enabledBodyList = _.reject(request.body[request.body.mode], 'disabled');
        if (!_.isEmpty(enabledBodyList)) {
          requestBody += 'dataList = []\n';
          requestBody += 'boundary = \'wL36Yn8afVp8Ag7AmP8qZ0SA4n1v9T\'\n';
          enabledBodyList.forEach((data) => {
            requestBody += 'dataList.append(encode(\'--\' + boundary))\n';
            if (data.type !== 'file') {
              requestBody += `dataList.append(encode('Content-Disposition: form-data; name=${sanitize(data.key, 'form-data', true)};'))\n\n`; // eslint-disable-line max-len
              requestBody += 'dataList.append(encode(\'Content-Type: {}\'.format(\'' +
                (data.contentType ? data.contentType : 'text/plain') + '\')))\n';
              requestBody += 'dataList.append(encode(\'\'))\n\n';
              requestBody += `dataList.append(encode("${sanitize(data.value, 'form-data', true)}"))\n`;
            }
            else {
              var pathArray = data.src.split(path.sep),
                fileName = pathArray[pathArray.length - 1];
              requestBody += `dataList.append(encode('Content-Disposition: form-data; name=${sanitize(data.key, 'form-data', true)}; filename={0}'.format('${sanitize(fileName, 'formdata', true)}')))\n\n`; // eslint-disable-line max-len
              requestBody += `fileType = mimetypes.guess_type('${sanitize(data.src, 'formdata', true)}')[0] or 'application/octet-stream'\n`; // eslint-disable-line max-len
              requestBody += 'dataList.append(encode(\'Content-Type: {}\'.format(fileType)))\n';
              requestBody += 'dataList.append(encode(\'\'))\n\n';

              requestBody += `with open('${data.src}', 'rb') as f:\n`;
              requestBody += `${indentation}dataList.append(f.read())\n`;
            }
          });
          requestBody += 'dataList.append(encode(\'--\'+boundary+\'--\'))\n';
          requestBody += 'dataList.append(encode(\'\'))\n';
          requestBody += 'body = b\'\\r\\n\'.join(dataList)\n';
          requestBody += 'payload = body\n';
        }
        else {
          requestBody = 'boundary = \'\'\n';
          requestBody += 'payload = \'\'\n';
        }
        return requestBody;
      case 'file':
        return 'payload = "<file contents here>"\n';
      default:
        return 'payload = \'\'\n';
    }
  }
  return 'payload = \'\'\n';
};
