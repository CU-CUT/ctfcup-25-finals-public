import { GlobalRole, PrismaClient, ProjectRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { existsSync, statSync } from 'fs';
import { join, resolve } from 'path';

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = 'mytpass123';
const storageRootCandidates = [
    process.env.STORAGE_ROOT ?? '',
    resolve(__dirname, '../storage'),
    resolve(__dirname, '../../storage'),
].filter(Boolean);
const storageRoot = storageRootCandidates.find((p) => existsSync(p)) ?? resolve(__dirname, '../../storage');

interface SeedUser {
    email: string;
    fullName: string;
    jobTitle: string;
    department: string;
    globalRole: GlobalRole;
    managerEmail?: string | null;
    internalPhone?: string;
    voipSecret?: string;
}

const firstNames = [
    'Alex',
    'Maria',
    'Sergey',
    'Olga',
    'Nikolay',
    'Pavel',
    'Elena',
    'Tatiana',
    'Dmitry',
    'Viktor',
    'Artem',
    'Lilia',
    'Roman',
    'Irina',
    'Ilya',
    'Andrey',
    'Sofia',
    'Vadim',
    'Lev',
    'Anna',
];

const lastNames = [
    'Morozov',
    'Sidorov',
    'Kuznetsov',
    'Smirnov',
    'Orlov',
    'Volkov',
    'Fedorov',
    'Belov',
    'Antonov',
    'Bogdanov',
    'Kiselev',
    'Sorokin',
    'Biryukov',
    'Tarasov',
    'Makarov',
    'Loginov',
    'Stepanov',
    'Vinogradov',
    'Kulikov',
    'Yakovlev',
];

function buildName(seed: number) {
    return `${firstNames[seed % firstNames.length]} ${lastNames[seed % lastNames.length]}`;
}

async function main() {
    console.log('Resetting database...');
    await prisma.projectMembership.deleteMany();
    await prisma.file.deleteMany();
    await prisma.userSettings.deleteMany();
    await prisma.user.deleteMany();
    await prisma.project.deleteMany();
    await prisma.department.deleteMany();

    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    const departmentIds: Record<string, number> = {};
    const departmentMembers: Record<string, number[]> = {};

    const baseDepartments = [
        { name: 'Администрация', children: ['Служба надзора', 'Оперативный штаб'] },
        { name: 'Охрана', children: ['Дневные посты', 'Ночные посты'] },
        { name: 'Кухня', children: ['Пищеблок'] },
        { name: 'Медчасть', children: [] },
        { name: 'Логистика', children: ['Хозчасть', 'Склад'] },
        { name: 'Наблюдение', children: ['Видеомониторинг'] },
        { name: 'Связь', children: ['VoIP-служба'] },
    ];

    const departmentCodes: Record<string, string> = {
        'Администрация': 'ADMIN',
        'Служба надзора': 'WARD',
        'Оперативный штаб': 'OPS',
        'Охрана': 'GUARD',
        'Дневные посты': 'GUARD-DAY',
        'Ночные посты': 'GUARD-NIGHT',
        'Кухня': 'KITCHEN',
        'Пищеблок': 'FOOD',
        'Медчасть': 'MED',
        'Логистика': 'LOG',
        'Хозчасть': 'SUPPLY',
        'Склад': 'STORE',
        'Наблюдение': 'OBS',
        'Видео мониторинг': 'CCTV',
        'Связь': 'NET',
        'VoIP-служба': 'VOIP',
    };

    for (const dep of baseDepartments) {
        const created = await prisma.department.create({ data: { name: dep.name, code: departmentCodes[dep.name] } });
        departmentIds[dep.name] = created.id;
        departmentMembers[dep.name] = [];
    }

    for (const dep of baseDepartments) {
        for (const child of dep.children) {
            const created = await prisma.department.create({
                data: { name: child, code: departmentCodes[child], parentDepartmentId: departmentIds[dep.name] },
            });
            departmentIds[child] = created.id;
            departmentMembers[child] = [];
        }
    }

    const projectsData = [
        {
            code: 'WARD',
            name: 'Контроль блоков',
            description: 'Система контроля перемещений и дверей.',
            department: 'Служба надзора',
        },
        {
            code: 'CCTV',
            name: 'Видеонаблюдение',
            description: 'Потоки камер и тревоги по периметру.',
            department: 'Видеомониторинг',
        },
        {
            code: 'FOOD',
            name: 'Пищеблок',
            description: 'Рационы, графики кормления и снабжение.',
            department: 'Пищеблок',
        },
        {
            code: 'MED',
            name: 'Медотчет',
            description: 'Прием, учет лекарств, журналы осмотров.',
            department: 'Медчасть',
        },
        {
            code: 'LOG',
            name: 'Хозучет',
            description: 'Инвентарь, ключи, топливо, транспорт.',
            department: 'Хозчасть',
        },
        {
            code: 'VOIP',
            name: 'VoIP-внутряк',
            description: 'Телефония, SIP-транки, внутренние линии.',
            department: 'VoIP-служба',
        },
    ];

    const projectsByCode: Record<string, number> = {};

    for (const project of projectsData) {
        const created = await prisma.project.create({
            data: {
                name: project.name,
                code: project.code,
                description: project.description,
                departmentId: departmentIds[project.department],
            },
        });
        projectsByCode[project.code] = created.id;
    }

    const leadership: SeedUser[] = [
        {
            email: 'warden@myt.local',
            fullName: 'Илья Волков',
            jobTitle: 'Начальник тюрьмы',
            department: 'Администрация',
            globalRole: GlobalRole.admin,
            managerEmail: null,
        },
        {
            email: 'chief-guard@myt.local',
            fullName: 'Марина Громова',
            jobTitle: 'Старший надзиратель',
            department: 'Служба надзора',
            globalRole: GlobalRole.manager,
            managerEmail: 'warden@myt.local',
        },
        {
            email: 'kitchen-head@myt.local',
            fullName: 'Павел Кулин',
            jobTitle: 'Заведующий кухней',
            department: 'Кухня',
            globalRole: GlobalRole.lead,
            managerEmail: 'warden@myt.local',
        },
        {
            email: 'med-chief@myt.local',
            fullName: 'Ольга Лекарева',
            jobTitle: 'Главврач',
            department: 'Медчасть',
            globalRole: GlobalRole.manager,
            managerEmail: 'warden@myt.local',
        },
        {
            email: 'ops-head@myt.local',
            fullName: 'Дмитрий Стрелков',
            jobTitle: 'Начальник хозчасти',
            department: 'Логистика',
            globalRole: GlobalRole.manager,
            managerEmail: 'warden@myt.local',
        },
        {
            email: 'surveillance@myt.local',
            fullName: 'Антон Камеров',
            jobTitle: 'Руководитель видеомониторинга',
            department: 'Наблюдение',
            globalRole: GlobalRole.lead,
            managerEmail: 'chief-guard@myt.local',
        },
        {
            email: 'night-lead@myt.local',
            fullName: 'Сергей Ночной',
            jobTitle: 'Старший смены (ночь)',
            department: 'Ночные посты',
            globalRole: GlobalRole.lead,
            managerEmail: 'chief-guard@myt.local',
        },
        {
            email: 'day-lead@myt.local',
            fullName: 'Анна Дневная',
            jobTitle: 'Старший смены (день)',
            department: 'Дневные посты',
            globalRole: GlobalRole.lead,
            managerEmail: 'chief-guard@myt.local',
        },
        {
            email: 'store-lead@myt.local',
            fullName: 'Виктор Складской',
            jobTitle: 'Завсклад',
            department: 'Склад',
            globalRole: GlobalRole.lead,
            managerEmail: 'ops-head@myt.local',
        },
        {
            email: 'voip-lead@myt.local',
            fullName: 'Николай Связист',
            jobTitle: 'Руководитель VoIP',
            department: 'VoIP-служба',
            globalRole: GlobalRole.lead,
            managerEmail: 'warden@myt.local',
        },
    ];

    const seeds: SeedUser[] = [...leadership];

    function bulkAdd(prefix: string, department: string, managerEmail: string, count: number, jobTitles: string[]) {
        for (let i = 0; i < count; i++) {
            const name = buildName(i + seeds.length + prefix.length);
            seeds.push({
                email: `${prefix}${i + 1}@myt.local`,
                fullName: name,
                jobTitle: jobTitles[i % jobTitles.length],
                department,
                globalRole: GlobalRole.employee,
                managerEmail,
                internalPhone: `10${(i + 1).toString().padStart(3, '0')}`,
                voipSecret: department.includes('VoIP') ? `voip-${i + 100}` : undefined,
            });
        }
    }

    bulkAdd('guard-day', 'Дневные посты', 'day-lead@myt.local', 15, ['Надзиратель', 'Инспектор КПП', 'Постовой']);
    bulkAdd('guard-night', 'Ночные посты', 'night-lead@myt.local', 12, ['Надзиратель', 'Старший смены', 'Оперативный дежурный']);
    bulkAdd('kitchen', 'Пищеблок', 'kitchen-head@myt.local', 12, ['Повар', 'Повар-ночь', 'Кладовщик кухни']);
    bulkAdd('med', 'Медчасть', 'med-chief@myt.local', 8, ['Фельдшер', 'Медсестра', 'Фармацевт']);
    bulkAdd('log', 'Хозчасть', 'ops-head@myt.local', 10, ['Слесарь', 'Электрик', 'Обеспечение режима']);
    bulkAdd('store', 'Склад', 'store-lead@myt.local', 8, ['Кладовщик', 'Транспортная служба', 'Учёт инвентаря']);
    bulkAdd('surv', 'Видеомониторинг', 'surveillance@myt.local', 8, ['Оператор ЦОУ', 'Аналитик тревог', 'Техник камер']);
    bulkAdd('voip', 'VoIP-служба', 'voip-lead@myt.local', 6, ['VoIP-инженер', 'SIP-настройщик', 'Техник связи']);

    const userIdByEmail: Record<string, number> = {};

    for (const user of seeds) {
        const passwordToUse = user.email === 'warden@myt.local' ? DEFAULT_PASSWORD : randomBytes(9).toString('base64');
        const passwordHash = await bcrypt.hash(passwordToUse, 10);
        const created = await prisma.user.create({
            data: {
                email: user.email,
                passwordHash,
                fullName: user.fullName,
                globalRole: user.globalRole,
                jobTitle: user.jobTitle,
                departmentId: departmentIds[user.department],
                managerId: user.managerEmail ? userIdByEmail[user.managerEmail] : null,
                internalPhone: user.internalPhone ?? null,
                voipSecret: user.voipSecret ?? null,
                avatarUrl: null,
            },
        });
        userIdByEmail[user.email] = created.id;
        departmentMembers[user.department].push(created.id);
    }

    console.log(`Created ${Object.keys(userIdByEmail).length} users`);

    async function addMember(projectCode: string, email: string, role: ProjectRole) {
        const projectId = projectsByCode[projectCode];
        const userId = userIdByEmail[email];
        if (!projectId || !userId) return;
        await prisma.projectMembership.upsert({
            where: { projectId_userId: { projectId, userId } },
            update: { role },
            create: { projectId, userId, role },
        });
    }

    await addMember('WARD', 'chief-guard@myt.local', ProjectRole.TL);
    await addMember('CCTV', 'surveillance@myt.local', ProjectRole.TL);
    await addMember('FOOD', 'kitchen-head@myt.local', ProjectRole.TL);
    await addMember('MED', 'med-chief@myt.local', ProjectRole.TL);
    await addMember('LOG', 'ops-head@myt.local', ProjectRole.TL);
    await addMember('VOIP', 'voip-lead@myt.local', ProjectRole.TL);

    function attachBulk(projectCode: string, department: string, roles: ProjectRole[]) {
        const members = departmentMembers[department] ?? [];
        return Promise.all(
            members.slice(0, roles.length).map((userId, idx) => {
                const role = roles[idx] ?? ProjectRole.DEV;
                return prisma.projectMembership.upsert({
                    where: { projectId_userId: { projectId: projectsByCode[projectCode], userId } },
                    update: { role },
                    create: { projectId: projectsByCode[projectCode], userId, role },
                });
            }),
        );
    }

    await attachBulk('WARD', 'Дневные посты', [ProjectRole.DEV, ProjectRole.DEV, ProjectRole.QA, ProjectRole.DEVOPS, ProjectRole.ANALYST]);
    await attachBulk('WARD', 'Ночные посты', [ProjectRole.DEV, ProjectRole.DEVOPS, ProjectRole.QA]);
    await attachBulk('CCTV', 'Видеомониторинг', [ProjectRole.DEVOPS, ProjectRole.DEV, ProjectRole.QA]);
    await attachBulk('FOOD', 'Пищеблок', [ProjectRole.DEV, ProjectRole.ANALYST, ProjectRole.QA]);
    await attachBulk('MED', 'Медчасть', [ProjectRole.DEV, ProjectRole.ANALYST]);
    await attachBulk('LOG', 'Хозчасть', [ProjectRole.DEVOPS, ProjectRole.ANALYST]);
    await attachBulk('VOIP', 'VoIP-служба', [ProjectRole.DEVOPS, ProjectRole.DEV, ProjectRole.ANALYST]);

    const filesSeed = [
        {
            ownerEmail: 'warden@myt.local',
            name: 'Приказ №1',
            mimeType: 'text/plain',
            accessLevel: 'public',
            projectCode: null,
            path: `files/ADMIN/Приказ1.txt`,
        },
        {
            ownerEmail: 'chief-guard@myt.local',
            name: 'Распределение постов.md',
            mimeType: 'text/markdown',
            accessLevel: 'department',
            projectCode: 'WARD',
            path: `files/WARD/Распределение постов.md`,
        },
        {
            ownerEmail: 'surveillance@myt.local',
            name: 'Список камер.txt',
            mimeType: 'text/plain',
            accessLevel: 'department',
            projectCode: 'CCTV',
            path: `files/CCTV/Список камер.txt`,
        },
        {
            ownerEmail: 'surveillance@myt.local',
            name: 'TOP-SECRET-07.12.2025.webp',
            mimeType: 'text/plain',
            accessLevel: 'department',
            projectCode: 'CCTV',
            path: `files/CCTV/TOP-SECRET-07.12.2025.webp`,
        },
        {
            ownerEmail: 'kitchen-head@myt.local',
            name: 'Меню на неделю.pdf',
            mimeType: 'application/pdf',
            accessLevel: 'public',
            projectCode: 'FOOD',
            path: `files/FOOD/Меню на неделю.pdf`,
        },
        {
            ownerEmail: 'med-chief@myt.local',
            name: 'Журнал лекарств.txt',
            mimeType: 'text/plain',
            accessLevel: 'department',
            projectCode: 'MED',
            path: `files/MED/Журнал лекарств.txt`,
        },
        {
            ownerEmail: 'ops-head@myt.local',
            name: 'Список ключей.txt',
            mimeType: 'text/plain',
            accessLevel: 'personal',
            projectCode: 'LOG',
            path: `files/SUPPLY/Ключи.txt`,
        },
        {
            ownerEmail: 'store-lead@myt.local',
            name: 'Учёт топлива.txt',
            mimeType: 'text/plain',
            accessLevel: 'department',
            projectCode: 'LOG',
            path: `files/STORE/Учёт топлива.txt`,
        },
        {
            ownerEmail: 'voip-lead@myt.local',
            name: 'search engine',
            mimeType: 'text/plain',
            accessLevel: 'department',
            projectCode: 'VOIP',
            path: `files/VOIP/search_engine`,
        },
        {
            ownerEmail: 'voip-lead@myt.local',
            name: 'sip.conf',
            mimeType: 'text/plain',
            accessLevel: 'department',
            projectCode: 'VOIP',
            path: `files/VOIP/sip.conf`,
        },
    ];

    for (const file of filesSeed) {
        const ownerId = userIdByEmail[file.ownerEmail];
        if (!ownerId) continue;
        const size = (() => {
            const abs = join(storageRoot, file.path);
            return existsSync(abs) ? statSync(abs).size : 0;
        })();
        await prisma.file.create({
            data: {
                ownerId,
                name: file.name,
                mimeType: file.mimeType,
                sizeBytes: size,
                accessLevel: file.accessLevel as any,
                projectId: file.projectCode ? projectsByCode[file.projectCode] : null,
                path: file.path,
            },
        });
    }

    console.log('Seed completed');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
