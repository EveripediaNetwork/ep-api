import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToOne,
  JoinColumn,
} from 'typeorm'
import Wiki from './wiki.entity'

@Entity('wiki_korean_translations')
export default class WikiKoreanTranslation {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'wiki_id', type: 'varchar', length: 255 })
  @Index()
  wikiId!: string

  @Column({ name: 'title', type: 'text', nullable: true })
  title!: string | null // Note: Title is not translated in current implementation, kept for legacy compatibility

  @Column({ name: 'summary', type: 'text', nullable: true })
  summary!: string | null

  @Column({ name: 'content', type: 'text', nullable: true })
  content!: string | null

  @Column({
    name: 'translation_status',
    type: 'enum',
    enum: ['pending', 'completed', 'failed', 'partial'],
    default: 'pending',
  })
  translationStatus!: 'pending' | 'completed' | 'failed' | 'partial'

  @Column({
    name: 'translation_provider',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  translationProvider!: string | null

  @Column({
    name: 'translation_model',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  translationModel!: string | null

  @Column({
    name: 'translation_cost',
    type: 'decimal',
    precision: 10,
    scale: 6,
    nullable: true,
  })
  translationCost!: number | null

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date

  @OneToOne(() => Wiki)
  @JoinColumn({ name: 'wiki_id', referencedColumnName: 'id' })
  wiki!: Wiki
}
