export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { target, ports } = req.body;

    if (!target || !ports) {
        return res.status(400).json({ error: 'Target and Ports are required' });
    }

    const portArray = ports.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p));
    const cleanTarget = target.replace(/(^\w+:|^)\/\//, '');

    const checkPort = (port) => {
        return new Promise((resolve) => {
            import('net').then(({ default: net }) => {
                const socket = new net.Socket();
                socket.setTimeout(2500); // 2.5 seconds timeout for fast scanning

                socket.on('connect', () => {
                    socket.destroy();
                    resolve({ port, status: 'OPEN', service: getCommonService(port) });
                });

                socket.on('timeout', () => {
                    socket.destroy();
                    resolve({ port, status: 'CLOSED', service: 'Unknown' });
                });

                socket.on('error', () => {
                    socket.destroy();
                    resolve({ port, status: 'CLOSED', service: 'Unknown' });
                });

                socket.connect(port, cleanTarget);
            }).catch(() => {
                resolve({ port, status: 'ERROR', service: 'Internal Error' });
            });
        });
    };

    function getCommonService(port) {
        const services = {
            21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP',
            53: 'DNS', 80: 'HTTP', 110: 'POP3', 443: 'HTTPS',
            3306: 'MySQL', 8080: 'HTTP-Proxy'
        };
        return services[port] || 'Unknown Service';
    }

    try {
        const promises = portArray.map(port => checkPort(port));
        const results = await Promise.all(promises);
        const openPorts = results.filter(r => r.status === 'OPEN');
        
        return res.status(200).json({ success: true, results: openPorts, totalScanned: results.length });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
                                     }
      
