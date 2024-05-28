import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { DataSource } from 'typeorm'
// import { HttpException, HttpStatus } from '@nestjs/common'
import UserService from './user.service'
import TokenValidator from '../utils/validateToken'

describe('UserService', () => {
  let service: UserService
  let dataSource: Partial<DataSource>
  let configService: Partial<ConfigService>
  let tokenValidator: Partial<TokenValidator>

  const mockQueryBuilder: any = {
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockReturnThis(),
    create: jest.fn().mockReturnThis(),
    save: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    execute: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockReturnThis(),
  }

  beforeEach(async () => {
    dataSource = {
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        create: jest.fn().mockReturnValue({}),
        save: jest.fn().mockReturnValue({}),
      }),
    }

    configService = {
      get: jest.fn().mockReturnValue('fakeApiKey'),
    }

    tokenValidator = {
      validateToken: jest.fn().mockReturnValue('fakeValidatedId'),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: DataSource, useValue: dataSource },
        { provide: ConfigService, useValue: configService },
        { provide: TokenValidator, useValue: tokenValidator },
      ],
    }).compile()

    service = module.get<UserService>(UserService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('createProfile', () => {
    it('should return false if validateEnsAddr returns false', async () => {
      jest.spyOn(service, 'validateEnsAddr').mockResolvedValueOnce(false)

      const result = await service.createProfile('{"id": "1"}', 'token')

      expect(result).toBe(false)
    })

    it('should create and return a new profile if it does not exist', async () => {
      jest.spyOn(service, 'validateEnsAddr').mockResolvedValueOnce(true)
      mockQueryBuilder.getOne.mockResolvedValueOnce(null)
      mockQueryBuilder.getRawOne.mockResolvedValueOnce(null)

      const profileData = {
        id: '1',
        username: 'user',
        bio: 'bio',
        email: 'email@example.com',
        avatar: 'avatar',
        banner: 'banner',
        links: [],
        notifications: [],
        advancedSettings: {},
      }

      const result = await service.createProfile(
        JSON.stringify(profileData),
        'token',
      )

      expect(result).toEqual({})
    })

    it('should update and return the profile if it exists', async () => {
      jest.spyOn(service, 'validateEnsAddr').mockResolvedValueOnce(true)
      mockQueryBuilder.getOne.mockResolvedValueOnce({ id: '1' })

      const profileData = {
        id: '1',
        username: 'user',
        bio: 'bio',
        email: 'email@example.com',
        avatar: 'avatar',
        banner: 'banner',
        links: [],
        notifications: [],
        advancedSettings: {},
      }

      const result = await service.createProfile(
        JSON.stringify(profileData),
        'token',
      )

      expect(result).toEqual({ id: '1' })
    })

    it('should create a new profile and user if neither exists', async () => {
      jest.spyOn(service, 'validateEnsAddr').mockResolvedValueOnce(true)
      mockQueryBuilder.getOne.mockResolvedValueOnce(null)
      mockQueryBuilder.getRawOne.mockResolvedValueOnce(null)

      const profileData = {
        id: '1',
        username: 'user',
        bio: 'bio',
        email: 'email@example.com',
        avatar: 'avatar',
        banner: 'banner',
        links: [],
        notifications: [],
        advancedSettings: {},
      }

      const result = await service.createProfile(
        JSON.stringify(profileData),
        'token',
      )

      expect(result).toEqual({})
    })

    it('should create a new profile if user exists but profile does not', async () => {
      jest.spyOn(service, 'validateEnsAddr').mockResolvedValueOnce(true)
      mockQueryBuilder.getOne.mockResolvedValueOnce(null)
      mockQueryBuilder.getRawOne.mockResolvedValueOnce({ id: '1' })

      const profileData = {
        id: '1',
        username: 'user',
        bio: 'bio',
        email: 'email@example.com',
        avatar: 'avatar',
        banner: 'banner',
        links: [],
        notifications: [],
        advancedSettings: {},
      }

      const result = await service.createProfile(
        JSON.stringify(profileData),
        'token',
      )

      expect(result).toEqual({})
    })

    it('should create a new user if profile exists but user does not', async () => {
      jest.spyOn(service, 'validateEnsAddr').mockResolvedValueOnce(true)
      mockQueryBuilder.getOne.mockResolvedValueOnce({ id: '1' })
      mockQueryBuilder.getRawOne.mockResolvedValueOnce(null)

      const profileData = {
        id: '1',
        username: 'user',
        bio: 'bio',
        email: 'email@example.com',
        avatar: 'avatar',
        banner: 'banner',
        links: [],
        notifications: [],
        advancedSettings: {},
      }

      const result = await service.createProfile(
        JSON.stringify(profileData),
        'token',
      )

      expect(result).toEqual({ id: '1' })
    })

    // it('should throw HttpException if validateToken returns an invalid id', async () => {
    //   tokenValidatorMock.validateToken = jest.fn().mockReturnValue('invalidId')

    //   const profileData = {
    //     id: '1',
    //     username: 'user',
    //     bio: 'bio',
    //     email: 'email@example.com',
    //     avatar: 'avatar',
    //     banner: 'banner',
    //     links: [],
    //     notifications: [],
    //     advancedSettings: {},
    //   }

    //   await expect(
    //     service.createProfile(JSON.stringify(profileData), 'token'),
    //   ).rejects.toThrowError(
    //     new HttpException('Invalid token', HttpStatus.UNAUTHORIZED),
    //   )
    // })
  })
})
