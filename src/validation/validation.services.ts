import { Injectable } from "@nestjs/common";
import { MssqlService } from '@strongnguyen/nestjs-mssql';
import { DynamicDatabaseService } from '../database/dynamic-database.service';
import { FilesService } from "../files/files.service";

@Injectable()
export class ValidationServices {
    constructor(
        private readonly mssql: MssqlService,
        private readonly filesService: FilesService,
        private readonly dynamicDatabaseService: DynamicDatabaseService,
    ) {}

    /**
     * Validación de requisitos iniciales
     * @param claveDocente 
     */
    async requisitosIniciales(
        claveDocente: string
    ): Promise<Record<string, boolean>[]> {
        const resultados: Record<string, boolean>[] = [];
        // implementación

        return resultados;
    }

    /*
     *  Constancia de Recursos Humanos que especifique el nombramiento de tiempo completo en estatus 10 o 95
     *  sin titular, a partir de la quincena 01 del {año}, y que no ha sido acreedor a algún tipo de sanción, habiendo
     *  cumplido con al menos el 90% de asistencia de acuerdo con su jornada y horario de trabajo durante el
     *  período a evaluar.
     */
    async recursosHumanos(
        claveDocente: string,
        año: number,
    ): Promise<Record<string, boolean>[]> {
        const results: Record<string, boolean>[] = [];
        const claveDepartamento = ''; 

        const nombramiento = await this.dynamicDatabaseService.executeQueryByDepartmentId(
            claveDepartamento,
            `SELECT 
                Estado as estado,
                Fecha as fechaIngreso,
                CargaHoraria as cargaHoraria
            FROM Docente
            WHERE ClaveDocente = @ClaveDocente`,
            [{ name: 'ClaveDocente', value: claveDocente }]
        )

        const sanciones = await this.dynamicDatabaseService.executeQueryByDepartmentId(
            claveDepartamento,
            `SELECT 
                COUNT(*) as totalSanciones
            FROM Sancion
            WHERE ClaveDocente = @ClaveDocente`,
            [{ name: 'ClaveDocente', value: claveDocente }]
        )

        const asistencia = await this.dynamicDatabaseService.executeQueryByDepartmentId(
            claveDepartamento,
            `SELECT
                SUM(Asistencias + Justificadas) as asistencias
            FROM Asistencia
            WHERE ClaveDocente = @ClaveDocente 
                AND Año = @Año`,
            [{ name: 'ClaveDocente', value: claveDocente },
             { name: 'Año', value: año }]
        )

        results.push({
            'Nombramiento tiempo completo (estatus 10 o 95)': 
                (nombramiento[0]?.cargaHoraria === 'TIEMPO COMPLETO') && 
                (nombramiento[0]?.estado === '10' || nombramiento[0]?.estado === '95'),
            'Sin sanciones': sanciones[0]?.totalSanciones === 0,
            'Asistencia >= 90%': (asistencia[0]?.asistencias) >= 0.9 * 170, // asumiendo 170 días laborables al año
        });

        return results;
    }

    /**
     * Horarios de labores del periodo a evaluar {año} y del primer semestre del año actual. Cumplir con la carga
     * académica reglamentaria
     */
    async cargaReglamentaria(
        claveDocente: string,
        añoActual: number,
        añoEvaluar: number,
    ) {
        
    }
}