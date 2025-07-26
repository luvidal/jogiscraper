const firstNames = [
    'Camila', 'Mateo', 'Florencia', 'Benjamin', 'Antonia', 'Vicente', 'Isidora', 'Lucas',
    'Martina', 'Tomas', 'Josefa', 'Diego', 'Emilia', 'Joaquin', 'Valentina', 'Agustin',
    'Trinidad', 'Matias', 'Fernanda', 'Cristobal', 'Javiera', 'Sebastian', 'Daniela',
    'Ignacio', 'Amanda', 'Maximiliano', 'Paulina', 'Francisco', 'Catalina', 'Ricardo'
]

const lastNames = [
    'Soto', 'Rojas', 'Fuentes', 'Reyes', 'Gonzalez', 'Herrera', 'Ramirez', 'Morales',
    'Navarro', 'Paredes', 'Vega', 'Salinas', 'Araya', 'Leiva', 'Saez', 'Carrasco',
    'Espinoza', 'Munoz', 'Godoy', 'Tapia', 'Aguilera', 'Castro', 'Pinto', 'Figueroa',
    'Olivares', 'Barra', 'Cardenas', 'Uribe', 'Lobos', 'Riveros'
]

const companies = [
    'Aurora Contabilidad', 'Servicios Contables Tolten', 'Norte Asesores', 'Delta Tributaria',
    'Gestion Andes', 'Contadores Elqui', 'Soluciones Fiscales Biobio', 'Estudio Contable Patagonia',
    'Auditax', 'Planifica Chile', 'Balance Sur', 'Contalab', 'Contaluz', 'Andina Fiscal',
    'RentaExpert', 'Consultora Austral', 'Tolten Finanzas', 'Cuentas Claras', 'Integra Tributaria'
]

function random(arr) {
    return arr[Math.floor(Math.random() * arr.length)]
}

export function person() {
    const first = random(firstNames)
    const last = random(lastNames)
    const name = `${first} ${last}`
    const company = random(companies)
    const base = company.replace(/[^a-zA-Z]/g, '').toLowerCase()
    const domain = Math.random() < 0.5 ? 'gmail.com' : 'hotmail.com'
    const email = `${base}@${domain}`

    return { name, company, email }
}