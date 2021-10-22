let _web3 = null, 
            accs=[], 
            contract = null, 
            connected = false
            methods = [],
            defaultGasLimit = '670000';

        let ddown = $('#ddown');

        let acc = {
            ME: '0xF19250A3320bE69B80daf65D057aE05Bb12F0919',
            SS: '0xB6e3974F93B9e5790Ae0a3f4Aea00c83bdD26bfc',

        };


        $('#connect').on('click', start);
        $('#storage-value').on('click', getStorageValue);
        ddown.on('change', prepMethodParams);
        ddown.on('click', ddownClicked);

        function ddownClicked() {
            if(!connected) {
                _s('please connect first!', 'e');
                return;
            }
            ddown.off('click', ddownClicked);
        }

        function _s(s, w) {
            $('#status-div').attr('class', '');
            $('#status-div').addClass('status-' + w);
            $('#status').text(s);
        }

        function _r(r, w) {
            $('#result-div').attr('class', '');
            $('#result-div').addClass('status-' + w);
            $('#result').text(r);
        }

        function prepMethods() {
            methods = ABI.filter(a => a.type === 'function')
                .map(b => {
                    return {
                        ips: b.inputs.map(ip => { return {name: ip.name, type: ip.type}}),
                        name: b.name,
                        mut: b.stateMutability === 'view' ? !1 : !0,
                        pay: b.stateMutability === 'payable' ? !0 : !1,
                    }
                })
        }

        function fillMethods() {
            methods.forEach((m, i) => 
                ddown.append($("<option></option>")
                    .attr("value", i)
                    .attr('class', 'dd-item')
                    .text(m.name))
            );
        }

        function prepMethodParams(e) {
            debugger;
            let i = +$(this).val();
            if(i < 0) return;
            let meth = methods[i], 
                genIps = $('#gen-ips'), 
                btn = $('#callorsend'),
                inp = null;
            
            genIps.html('');

            meth.ips.forEach(ip => {
                inp = $('<input>')
                        .attr('id', ip.name)
                        .attr('class', 'form-control ips')
                        .attr('placeholder', 'type ' + ip.type + ' here...');
                lbl = $('<label></label>').text(ip.name)
                genIps.append(lbl);
                genIps.append(inp);
            })

            btn.off('click', send);
            btn.off('click', call);

            if(meth.mut) {
                genIps.append($('<label></label>').text('Gas'));
                genIps.append(
                    $('<input>')
                    .attr('id', 'gaslimit')
                    .attr('class', 'form-control ips')
                );
                btn.on('click', send);
                btn.text('Send');
            } else {
                btn.on('click', call);
                btn.text('Call');
            }

            btn.data('index', i);
            btn.removeClass('d-none');

        }

        function call() {
            let meth = methods[$(this).data('index')], 
                ips = $('.ips'),
                params = [],
                err = {
                    v: false,
                    t: '',
                };
            console.log('call:', meth);
            ips.each((_, ip) => {
                let v = $(ip).val();
                if(!v) {
                    err.v = true;
                    err.t = ip.id;
                } else params.push(v);
            })

            if(err.v) {
                console.log('Error:', err);
                _s('Please fill all the ip params', 'e');
                return;
            }
            
            _s('calling, please wait...');
            contract
            .methods[meth.name](...params)
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
            .finally(_ => _s('call completed.', 'n'));
        }

        function send(e) {
            let meth = methods[$(this).data('index')], 
                ips = $('.ips'),
                p = [],
                err = {
                    level: 0,
                    ids: [],
                };
            
            ips.each((_, ip) => {
                let v = $(ip).val();
                if(!v) {
                    ++err.level;
                    err.ids.push(ip.id);
                } else p.push(v);
            })
            
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
            let params = p.slice(0, p.length-1), gasLimit = p[p.length-1];
            console.log('sending with params:', params); 
            _s('sending, please wait...', 'n');
            contract
            .methods[meth.name](...params)
            .send({from: accs[0], gas: gasLimit})
            .then(res => {
                console.log('call success:', res);
                if(typeof res == 'object') res = 'success';
                _r(res, 's');
            })
            .catch(e => {
                console.log('call Error:', e);
                _r('Call resulted into an error!!!. (please open console for details)', 'e');
            })
            .finally(_ => _s('send completed.', 'n'));
        }

        function start() {
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
            // let abi = $('#abi').val();
            if(!ABI) {
                console.log('No ABI provided');
                return;
            }

            // let address = $('#address').val();
            if(!contractAddress) {
                console.log('please provide contract address');
                return;
            }

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
            let index = $('#storage-value-ip').val();
            let address = $('#c-address').val() || contractAddress;
            if(!index) {
                _s('provide index', 'e');
                return;
            }
            _web3.eth.getStorageAt(address, +index)
                .then(res => {
                    console.log('Success:', res, _web3.utils.toAscii(res))
                    _r(res, 's');
                })
                .catch(e => {
                    console.log('error:', e);
                    _r('Error getting storage value', 'e');
                })
                .finally(_ => _s('getting storage value completed.', 'n'));     
        }