let _web3 = null,
    ABI = null;
    contractAddress = '',
    accs=[], 
    contract = null, 
    connected = false
    methods = [],
    defaultGasLimit = '670000',
    autoScrollTime = 3250, // 3.25 s
    targetId = '';

        let ddown = $('#ddown');

        let acc = {
            ME: '0xF19250A3320bE69B80daf65D057aE05Bb12F0919',
            SS: '0xB6e3974F93B9e5790Ae0a3f4Aea00c83bdD26bfc',

        };


        $('#connect').on('click', start);
        $('#storage-value').on('click', getStorageValue);
        $('#abiFile').on('change', loadAbiFromFile);
        ddown.on('change', prepMethodParams);
        ddown.on('click', ddownClicked);

        function ddownClicked() {
            if(!connected) {
                _s('please connect first!', 'e');
                return;
            }
            ddown.off('click', ddownClicked);
        }

        function autoScroll(w) {
            window.location.hash = '#all-status-container';
            if(w === 'e')
                setTimeout(_ => window.location.hash = targetId, autoScrollTime);
        }

        function post(op) {
            $(op.id1).attr('class', '');
            $(op.id1).addClass('status-' + op.w);
            $(op.id2).text(op.msg);
        }

        function _s(s, w) {
            post({
                id1:'#status-div',
                id2: '#status',
                w: w,
                msg: s,
            });
            autoScroll(w);
        }

        function _r(r, w) {
            post({
                id1:'#result-div',
                id2: '#result',
                w: w,
                msg: r,
            });
            autoScroll(w);
        }

        function prepMethods() {
            methods = ABI.filter(a => a.type === 'function')
                .map(b => {
                    return {
                        inputs: b.inputs.map(ip => { return {name: ip.name, type: ip.type}}),
                        name: b.name,
                        mutable: b.stateMutability === 'view' ? !1 : !0,
                        payable: b.stateMutability === 'payable' ? !0 : !1,
                    }
                })
        }

        function fillMethods() {
            methods.forEach((m, i) => 
                ddown.append($("<option></option>")
                    .attr("value", i)
                    .attr('class', 'dd-item')
                    .text(
                        `${m.name} (${
                            (m.payable ? ' (payable)': 'non-payable')
                            + ', ' +
                            (m.mutable ? ' mutable': 'view')
                        })`
                    )
                )
            );
        }

        function prepMethodParams(e) {
            let i = +$(this).val();
            if(i < 0) return;
            let meth = methods[i], 
                genIps = $('#gen-ips'), 
                btn = $('#callorsend'),
                inp = null;
            
            genIps.html('');

            meth.inputs.forEach(ip => {
                inp = $('<input>')
                        .attr('id', ip.name)
                        .attr('name', ip.name)
                        .attr('class', 'form-control ips')
                        .attr('placeholder', 'type ' + ip.type + ' here...');
                lbl = $('<label></label>').text(ip.name)
                genIps.append(lbl);
                genIps.append(inp);
            })

            btn.off('click', send);
            btn.off('click', call);

            // incomplete functionality
            if(meth.payable) {
                // add input for send value
                genIps.append($('<label></label>').text('Payment Amount (value)'));
                genIps.append(
                    $('<input>')
                    .attr('id', 'payment')
                    .attr('name', 'payment')
                    .attr('placeholder', 'enter eth value here...')
                    .attr('class', 'form-control ips')
                );
            }

            if(meth.mutable) {
                genIps.append($('<label></label>').text('Gas'));
                genIps.append(
                    $('<input>')
                    .attr('id', 'gaslimit')
                    .attr('name', 'gaslimit')
                    .attr('placeholder', 'enter amount of gas here...')
                    .attr('class', 'form-control ips')
                );
                btn.on('click', send);
                // btn.text('Send');
            } else {
                btn.on('click', call);
                // btn.text('Call');
            }

            btn.data('index', i);
            btn.removeClass('d-none');
        }

        function call() {
            targetId = '##contract-meth-container';
            let meth = methods[$(this).data('index')], 
                ips = $('.ips'),
                p = [],
                err = {
                    level: 0,
                    ids: [],
                    put: function(id) { ++this.level; this.ids.push(id); }
                };
            console.log('call:', meth);
            ips.each((_, ip) => !$(ip).val() ? err.put(ip.id) : p.push($(ip).val()))

            if(err.level > 0) {
                console.log(`you have ${err.level} errors:`, err);
                _s('Please fill-in all the input parameters', 'e');
                return;
            }
            
            _s('calling, please wait...');
            try {
                contract
                .methods[meth.name](...p)
                .call()
                .then(res => {
                    console.log('call success:', res);
                    if(typeof res == 'object') res = 'success';
                    _r(res, 's');
                })
                .catch(e => {
                    console.log('call Error:', e);
                    _r('Call resulted into an error!!!. (please open console for details)', 'e');
                })
                .finally(_ => _s('Call Completed.', 'n'));
            } catch (e) {
                console.log('call error:', e);
                _s('Call resulted in an Error, please try again (ensure correct input parameters as well)!!', 'e')
            }
        }

        function send(e) {
            targetId = '##contract-meth-container';
            let meth = methods[$(this).data('index')], 
                ips = $('.ips'),
                p = [],
                err = {
                    level: 0,
                    ids: [],
                    put: function(id) { ++this.level; this.ids.push(id); }
                };
            
            ips.each((_, ip) => !$(ip).val() ? err.put(ip.id) : p.push($(ip).val()));
            
            if(err.ids.includes('gaslimit')) {
                --err.level;
                err.ids.splice(err.ids.indexOf('gaslimit'), 1);
                p.push(defaultGasLimit);
            }

            if(err.level > 0) {
                console.log(`you have ${err.level} errors:`, err);
                _s('Please fill-in all the input parameters', 'e');
                return;
            }

            let f = meth.payable,
                params = p.slice(0, p.length - (f?2:1)), 
                gasLimit = p[p.length - 1],
                sendOpts = { from: accs[0], gas: gasLimit };
            
            if(f) sendOpts['value'] = p[p.length - 2];
            
            console.log('sending with params:', params, 'and send options:', sendOpts); 
            
            _s('Calling, please wait...', 'n');
            
            try {
                contract
                .methods[meth.name](...params)
                .send(sendOpts)
                .then(res => {
                    console.log('call success:', res);
                    if(typeof res == 'object') res = 'success';
                    _r(res, 's');
                })
                .catch(e => {
                    console.log('call Error:', e);
                    _r('Call resulted into an error!!!. (please open console for details)', 'e');
                })
                .finally(_ => _s('Call Completed.', 'n'));
            } catch (e) {
                console.log('call error:', e);
                _s('Call resulted in an Error, please try again (ensure correct input parameters as well)!!.', 'e')
            }
        }

        function getContractAddress() {
            contractAddress = $('#caddress').val();
        }

        function parseABI(txt) {
            let abi = null;
            try {
                abi = JSON.parse(txt);
            } catch (e) {
                let m = 'ABI is not in valid format!';
                _s(m, 'e');
                console.log(m + ':', e);
            }
            return abi;
        }

        function loadAbiFromTextArea() {
            let abiTxt = $('#abi').val();
            if(abiTxt) {
                ABI = parseABI(abiTxt);
                if(!ABI) throw "ABI error";
            }
        }

        function loadAbiFromFile(ev) {
            targetId = '#contract-prep-container';
            let frdr = new FileReader();
            frdr.onload = e => ABI = parseABI(e.target.result);
            frdr.readAsText(ev.target.files[0]);
        }

        function start() {
            targetId = '#contract-prep-container';
            getContractAddress();
            loadAbiFromTextArea();
          
            if(!contractAddress) {
                console.log('please provide contract address');
                _s('No contract address provided!', 'e')
                return;
            }
              
            if(!ABI) {
                console.log('No ABI provided');
                _s('No ABI provided!', 'e');
                return;
            }


            if (typeof window.ethereum !== 'undefined') {
              console.log('MetaMask is installed!');
              ethereum.enable();
              connect();
              prepMethods();
              fillMethods();
            } else {
                console.log('connecting to external wallet');
                _web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
            }  
        }

        async function connect() {
            _web3 = new Web3(window.ethereum);
            accs = await ethereum.request({ method: 'eth_accounts' });
            console.log('Accounts:', accs, contractAddress);
            _web3.eth.defaultAccount = accs[0];
            
            // initialize contract object with ABI and Address
            contract = new _web3.eth.Contract(ABI, contractAddress);
            // contract.once('Transfer', {
            //       filter: {user: accs[0]},
            //       fromBlock: "latest"
            //     }, function(err, ev){
            //       if (err) console.log(err)
            //       else {
            //         ev = _web3.utils.hexToUtf8(ev.returnValues.flipResult);
            //         console.log('Event:', ev);
            //       }
            //     }
            // ); 

            _s('Connected', 's');
            connected = true;
        }

        
        function getStorageValue() {
            _web3 = _web3 || new Web3(window.ethereum);
            let index = $('#storage-value-ip').val();
            let address = $('#c-address').val() || contractAddress;
            if(!index) {
                _s('provide index', 'e');
                return;
            }
            _web3.eth.getStorageAt(address, +index)
                .then(res => {
                    console.log('Success:', res, convert(res))
                    _r(`raw: ${res}, text: ${convert(res)}`, 's');
                })
                .catch(e => {
                    console.log('error:', e);
                    _r('Error getting storage value', 'e');
                })
                .finally(_ => _s('getting storage value completed.', 'n'));     
        }