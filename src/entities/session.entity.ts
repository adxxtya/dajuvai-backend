import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";

@Entity('sessions')
@Index(['userId', 'isRevoked'])
export class Session {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: number;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column()
    refreshTokenHash: string;

    @Column({ nullable: true })
    userAgent: string;

    @Column({ nullable: true })
    ipAddress: string;

    @Column()
    expiresAt: Date;

    @Column({ default: false })
    isRevoked: boolean;

    @CreateDateColumn()
    createdAt: Date;
}
